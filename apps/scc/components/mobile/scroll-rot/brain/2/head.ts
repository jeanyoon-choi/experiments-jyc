import * as THREE from "three";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

// The viewer's head, through the front camera. MediaPipe's face landmarker (the model and wasm the
// repository already serves for gaze-tracking) gives, with each face, the rigid transform of a canonical
// face into camera space: x to the image's right, y up, z towards the camera. Its rotation is the head's
// yaw, pitch and roll as someone facing the viewer would see them.
const WASM_URL = "/models/gaze-tracking/wasm";
const MODEL_URL = "/models/gaze-tracking/face_landmarker.task";
const READ_MS = 50; // at most 20 readings a second
const LOST_MS = 800; // no face for this long: the head is gone
const PROMPT_MS = 700; // a refusal quicker than this was not the viewer's answer

// The brain's front is −x in the scene (see scene.ts); a head that faces the camera faces +z.
const FRONT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

/**
 * Nothing is shown: the camera image only feeds the model. Without a camera, without permission or
 * without a face `pose` answers null and the caller carries on alone. `host` only holds the unseen video.
 */
export function createHead(host: HTMLElement) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("aria-hidden", "true");
  video.style.cssText = "position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  host.appendChild(video);

  let stream: MediaStream | null = null;
  let landmarker: FaceLandmarker | null = null;
  let session = 0; // raised whenever the camera is let go: whatever was still starting then gives up
  let starting = false;
  let granted = false;
  let failed = false; // the model could not be loaded or run: no further tries
  let disposed = false;
  let lastFrame = -1;
  let lastRead = 0;
  let seenAt = -Infinity;
  let heldAt: number | null = null; // since when reading has been held off; that time does not count towards losing the head
  const matrix = new THREE.Matrix4();
  const place = new THREE.Vector3();
  const size = new THREE.Vector3();
  const turn = new THREE.Quaternion();
  const measured = new THREE.Quaternion();

  const letGo = () => {
    session += 1;
    starting = false;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
    lastFrame = -1;
    seenAt = -Infinity;
    heldAt = null;
  };

  const onTouch = () => void start();
  const start = async () => {
    if (disposed || failed || starting || stream) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return;
    starting = true;
    const mine = ++session;
    const asked = performance.now();
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 } },
      });
      if (mine !== session) {
        next.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = next;
      granted = true;
      video.srcObject = next;
      await video.play();
      if (mine !== session) return;
      if (!landmarker) {
        // loaded only once there is a camera to read: the page without one never fetches the model
        const { FaceLandmarker: Landmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const files = await FilesetResolver.forVisionTasks(WASM_URL);
        const created = await Landmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
          outputFacialTransformationMatrixes: true,
        });
        if (disposed || landmarker) created.close();
        else landmarker = created;
        if (mine !== session) return;
      }
      starting = false;
    } catch (caught) {
      if (mine !== session) return;
      const hadCamera = stream !== null;
      letGo();
      if (hadCamera) failed = true;
      // Refused at once, before the viewer could have answered: the browser may want a touch first. Ask once more on the first one.
      else if (caught instanceof DOMException && caught.name === "NotAllowedError" && performance.now() - asked < PROMPT_MS) {
        host.addEventListener("pointerdown", onTouch, { once: true });
      }
    }
  };

  // a hidden page lets the camera go, and takes it back if it had been given
  const onVisibility = () => {
    if (document.hidden) letGo();
    else if (granted) void start();
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", letGo);
  void start();

  return {
    /**
     * Called every frame. With `free` it reads the head from the newest camera frame, if one is due;
     * without (a page in flight, a finger down) it only notes the pause. True when the model ran: that frame was a long one.
     */
    read(now: number, free: boolean) {
      if (!free) {
        heldAt ??= now;
        return false;
      }
      if (heldAt !== null) {
        seenAt += now - heldAt;
        heldAt = null;
      }
      if (!landmarker || !stream || now - lastRead < READ_MS) return false;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.currentTime === lastFrame) return false;
      lastFrame = video.currentTime;
      lastRead = now;
      try {
        const found = landmarker.detectForVideo(video, now).facialTransformationMatrixes[0];
        if (found?.data.length === 16) {
          matrix.fromArray(found.data).decompose(place, turn, size);
          // As a mirror shows it: reflected left to right, so yaw and roll change sign and the nod stays.
          measured.set(turn.x, -turn.y, -turn.z, turn.w).multiply(FRONT);
          seenAt = now;
        }
      } catch {
        failed = true;
        letGo();
      }
      return true;
    },
    /** Where the brain should stand to match the head, or null while no head is followed. Not smoothed. */
    pose(now: number): THREE.Quaternion | null {
      return (heldAt ?? now) - seenAt < LOST_MS ? measured : null;
    },
    dispose() {
      disposed = true;
      letGo();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", letGo);
      host.removeEventListener("pointerdown", onTouch);
      landmarker?.close();
      landmarker = null;
      video.remove();
    },
  };
}
