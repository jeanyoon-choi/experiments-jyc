// A live picture for the screen hung in the room (shading.ts liveAt). Anything that yields a MediaStream is a source:
// this computer's camera now (cameraSource), a mobile's camera over WebRTC later (streamSource on the peer's stream).
// Nothing here touches WebGL: assets.ts takes the frames.

export type LiveSource = {
  /** The picture when it holds a frame not yet taken; null otherwise (not started, refused, or no new frame). */
  take(): HTMLVideoElement | null;
  /** The picture's width over its height (1 until its first frame). */
  aspect(): number;
  /** Stops the stream (the camera's light goes out). */
  close(): void;
};

/** A source over any stream, once it arrives. A stream that never arrives (permission refused) gives no frames. */
export function streamSource(arriving: Promise<MediaStream>): LiveSource {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  let stream: MediaStream | null = null;
  let closed = false;
  let taken = -1;
  const stop = (ended: MediaStream) => ended.getTracks().forEach((track) => track.stop());
  arriving
    .then((arrived) => {
      if (closed) return stop(arrived);
      stream = arrived;
      video.srcObject = arrived;
      return video.play();
    })
    .catch(() => {});
  return {
    take() {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0 || video.currentTime === taken) return null;
      taken = video.currentTime;
      return video;
    },
    aspect: () => (video.videoHeight > 0 ? video.videoWidth / video.videoHeight : 1),
    close() {
      closed = true;
      if (stream) stop(stream);
      video.srcObject = null;
    },
  };
}

/** This computer's camera (asks for permission the first time; HTTPS only). */
export function cameraSource(): LiveSource {
  const devices = navigator.mediaDevices;
  if (!devices?.getUserMedia) return streamSource(Promise.reject(new Error("no camera")));
  return streamSource(devices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } }));
}

/** 라이브 화면's sources by their number in a Look (`liveScreen`; 0 is none). A new source is one more line here. */
export const LIVE_SOURCES: Readonly<Record<number, { label: string; open: () => LiveSource }>> = {
  1: { label: "웹캠", open: cameraSource },
};
