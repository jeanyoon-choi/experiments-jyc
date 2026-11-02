"use client";

import { useEffect, useRef, useState } from "react";
import { applyContactChanges, createNetwork, isLinked, lifeOf, pruneFaded, type ContactEvent, type NetworkNode, type Point } from "./model/network";
import { buildPose, createPerson, restEndpoints, toWorld, updatePerson, type Endpoints, type Figure, type Frame, type Person, type Point as BodyPoint, type Pose } from "./model/rig";
import { addCitizen, createPolitics, foundPolitics, leaningOf, measurePolitics, opinionAt, stepPolitics, type Citizen, type Politics } from "./model/politics";
import { ADULT_AGE, DEFAULT_SOCIETY, SECONDS_PER_YEAR, SLAP_HITS, addAgent, createSociety, partnerOf, stepSociety, type Agent, type Society } from "./model/society";
import { createLifeSound } from "./audio";
import styles from "./screen.module.css";

const maximumPixelRatio = 1.5;
const pulseDuration = 1600;
// Cross-session reach as a share of the screen's shorter side.
const reachShare = 0.3;
const lifetime = 5000;
// Edges are batched into this many opacity steps so fading costs a few strokes, not one per edge.
const opacitySteps = 24;
// /2's full-body state is five contacts, so a person is carried by its session's newest five nodes.
const personAnchors = 5;
// Stick-figure head radius in rest-body units; strokes are shared by every person, so their width is fixed.
const headRadius = 24;
const stickWidth = 2.5;
const bodiedNetworkOpacity = 0.2;
// A finished session's person shrinks into a walking adult about 60 px tall over this long.
const settleSeconds = 1.6;
const adultScale = 0.13;
const agentStickWidth = 1.75;
const agentHeadMinimum = 4;
// Each hand size founds a lineage hue; children blend their parents' hues, so lineages show as colour.
const foundingTraits = [45, 200, 345, 120];
// Hues are drawn in 10° bins so people of one bin and life stage share one stroke.
const hueBin = 10;
// The readout counts events over the last 20 model years and is rewritten about 12 times a second.
const rateYears = 20;
const readoutInterval = 80;

// The political landscape colours opinion from 하파 teal through a pale centre to 상파 amber, in 0.1 steps.
const lowerColor: [number, number, number] = [71, 198, 192];
const centerColor: [number, number, number] = [216, 216, 216];
const upperColor: [number, number, number] = [242, 165, 65];
const opinionBins = 10;

type Stick = { frame: Frame; pose: Pose };
type Walker = { x: number; vx: number; vy: number; stride: number };
type Settling = { agent: Agent; from: Figure; progress: number };
type Arriving = { citizen: Citizen; from: Figure; progress: number };
type Model = "love" | "politics";
const models: { id: Model; label: string }[] = [
  { id: "love", label: "사랑" },
  { id: "politics", label: "정치" },
];

export default function MobileFingerNetworkFive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [hasNodes, setHasNodes] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [model, setModel] = useState<Model>("love");
  const modelRef = useRef<Model>(model);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const readout = readoutRef.current;
    if (!canvas || !readout) return;
    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!context) return;

    const network = createNetwork();
    const useTouchEvents = "ontouchstart" in window;
    // Pointer identifiers are kept negative so they never share a slot with touch identifiers.
    const pointerIdentifier = (event: PointerEvent) => -1 - event.pointerId;
    const heldPointers = new Set<number>();
    let width = 1;
    let height = 1;
    let frame: number | null = null;
    let previousTime = 0;
    const nodeSteps = Array.from({ length: opacitySteps + 1 }, () => [] as NetworkNode[]);
    const personSteps = Array.from({ length: opacitySteps + 1 }, () => [] as Stick[]);
    const persons = new Map<number, Person>();
    const bodied = new Set<number>();
    const society = createSociety((Math.random() * 2 ** 31) | 0);
    const graduated = new Set<number>();
    let settling: Settling[] = [];
    const agentGroups = new Map<string, Stick[]>();
    const recent: { kind: string; time: number }[] = [];
    let lastEventTime = 0;
    let lastReadoutTime = -Infinity;
    // Each model keeps its own people; only the shown one runs.
    const politics = createPolitics((Math.random() * 2 ** 31) | 0);
    let arriving: Arriving[] = [];
    const citizenGroups = new Map<number, Stick[]>();
    // Faces meeting kiss, partings slap (betrayals shatter), newborns cry, touch-born people breathe, deaths get a few bars of piano.
    const sound = createLifeSound();
    const panOf = (x: number) => (x / width) * 2 - 1;

    // The landscape: a faint centre line divides 상파 above from 하파 below; people stand at their opinion's height.
    const drawPolitics = () => {
      const middle = height / 2;
      context.lineWidth = 1;
      context.strokeStyle = "rgba(255, 255, 255, 0.14)";
      context.beginPath();
      context.moveTo(0, middle);
      context.lineTo(width, middle);
      context.stroke();
      context.font = "400 10px ui-monospace, 'SF Mono', Menlo, monospace";
      context.textAlign = "center";
      context.fillStyle = "rgba(255, 255, 255, 0.5)";
      context.fillText("상파", width / 2, 22);
      context.fillText("하파", width / 2, height - 96);

      arriving = arriving.filter((entry) => {
        entry.progress = Math.min(1, entry.progress + elapsedFrame / settleSeconds);
        return entry.progress < 1 && entry.citizen.leftAt === null;
      });
      const arrivingIds = new Set(arriving.map((entry) => entry.citizen.id));
      // Who is talking to whom right now: within a side in that side's colour, across sides in red.
      const byId = politics.byId;
      for (const kind of ["upper", "lower", "cross"] as const) {
        context.lineWidth = 1;
        context.strokeStyle = kind === "cross" ? "rgba(255, 59, 48, 0.75)" : rgb(kind === "upper" ? upperColor : lowerColor);
        context.globalAlpha = kind === "cross" ? 1 : 0.35;
        context.beginPath();
        for (const contact of politics.contacts) {
          const a = byId.get(contact.from);
          const b = byId.get(contact.to);
          if (!a || !b) continue;
          const side = contact.cross ? "cross" : a.opinion >= 0 ? "upper" : "lower";
          if (side !== kind) continue;
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
        }
        context.stroke();
      }
      context.globalAlpha = 1;
      for (const list of citizenGroups.values()) list.length = 0;
      const sticks = new Map<number, Stick>();
      for (const citizen of politics.citizens) {
        const stick = stickFor(citizen, 1, null);
        sticks.set(citizen.id, stick);
        if (arrivingIds.has(citizen.id) || citizen.leftAt !== null) continue;
        const bin = opinionBin(leaningOf(citizen));
        const list = citizenGroups.get(bin) ?? [];
        list.push(stick);
        citizenGroups.set(bin, list);
      }
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = agentStickWidth;
      for (const [bin, list] of citizenGroups) {
        if (list.length === 0) continue;
        context.strokeStyle = rgb(opinionRgb(bin));
        context.beginPath();
        for (const stick of list) traceStick(context, stick, agentHeadMinimum);
        context.stroke();
      }
      // Retiring people fade where they stand.
      for (const citizen of politics.citizens) {
        if (citizen.leftAt === null) continue;
        context.globalAlpha = Math.max(0, 1 - (politics.time - citizen.leftAt) / 1.6);
        context.strokeStyle = rgb(opinionRgb(opinionBin(leaningOf(citizen))));
        context.beginPath();
        traceStick(context, sticks.get(citizen.id)!, agentHeadMinimum);
        context.stroke();
      }
      context.globalAlpha = 1;
      for (const { citizen, from, progress } of arriving) {
        const eased = progress * progress * (3 - 2 * progress);
        const target = sticks.get(citizen.id)!;
        context.lineWidth = stickWidth + (agentStickWidth - stickWidth) * eased;
        context.strokeStyle = mixColor([255, 255, 255], opinionRgb(opinionBin(leaningOf(citizen))), eased);
        context.beginPath();
        traceStick(context, { frame: mixFrame(from.frame, target.frame, eased), pose: buildPose(mixEndpoints(from.endpoints, walkEndpoints(citizen, null), eased)) }, agentHeadMinimum * eased);
        context.stroke();
      }

      if (lastFrameTime - lastReadoutTime >= readoutInterval) {
        lastReadoutTime = lastFrameTime;
        describePolitics(readout, politics);
      }
    };
    let elapsedFrame = 0;
    let lastFrameTime = 0;

    const paint = (time: number) => {
      frame = null;
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);

      pruneFaded(network, time, lifetime);
      const nodes = network.nodes;
      const lives = nodes.map((node) => lifeOf(node, time, lifetime));

      // Each session raises a person while its fingers are down. When its last finger lifts, the person
      // leaves the touch network and settles into the society as a small agent; its session's network still fades.
      const elapsedSeconds = previousTime ? Math.min(0.05, (time - previousTime) / 1000) : 1 / 60;
      previousTime = time;
      elapsedFrame = elapsedSeconds;
      lastFrameTime = time;
      const sessions = new Map<number, { nodes: NetworkNode[]; life: number; held: boolean }>();
      nodes.forEach((node, index) => {
        const session = sessions.get(node.session) ?? { nodes: [], life: 0, held: false };
        session.nodes.push(node);
        session.life = Math.max(session.life, lives[index]!);
        session.held ||= node.releasedAt === null;
        sessions.set(node.session, session);
      });
      for (const id of persons.keys()) if (!sessions.has(id)) persons.delete(id);
      for (const id of graduated) if (!sessions.has(id)) graduated.delete(id);
      for (const people of personSteps) people.length = 0;
      bodied.clear();
      for (const [id, session] of sessions) {
        if (graduated.has(id)) {
          bodied.add(id);
          continue;
        }
        const person = persons.get(id) ?? createPerson();
        persons.set(id, person);
        const anchors = new Map(session.nodes.slice(-personAnchors).map((node) => [node.id, node] as const));
        const figure = updatePerson(person, anchors, elapsedSeconds).figure;
        if (!figure) continue;
        bodied.add(id);
        if (session.held) {
          personSteps[opacitySteps]!.push({ frame: figure.frame, pose: buildPose(figure.endpoints) });
          continue;
        }
        const center = toWorld(figure.frame, midpoint(figure.endpoints.head, midpoint(figure.endpoints.leftFoot, figure.endpoints.rightFoot)));
        const from = { frame: { ...figure.frame }, endpoints: copyEndpoints(figure.endpoints) };
        sound.breath(panOf(center.x));
        if (modelRef.current === "politics") {
          // Where the person was let go is what it believes: higher on the screen is further 상파.
          const citizen = addCitizen(politics, { ...center, opinion: opinionAt(center.y, { height }) });
          arriving.push({ citizen, from, progress: 0 });
        } else {
          // The hand's finger count, two to five, picks the newcomer's founding lineage hue; it arrives as a young adult.
          const trait = foundingTraits[Math.min(session.nodes.length, personAnchors) - 2]! + (Math.random() - 0.5) * 30;
          const agent = addAgent(society, { ...center, trait, age: 18 + Math.random() * 10 });
          settling.push({ agent, from, progress: 0 });
        }
        graduated.add(id);
        persons.delete(id);
      }
      if (modelRef.current === "politics") {
        // A landscape starts as a crowd of near-neutral founders; touch-born people join it.
        if (politics.citizens.length === 0) foundPolitics(politics, { width, height });
        stepPolitics(politics, elapsedSeconds, { width, height });
      }
      else stepSociety(society, elapsedSeconds, { width, height });

      // A session that has raised a person recedes to a faint network, so the person reads first.
      const weights = nodes.map((node, index) => lives[index]! * (bodied.has(node.session) ? bodiedNetworkOpacity : 1));
      const reach = Math.min(width, height) * reachShare;
      // An edge is as visible as its weaker end.
      const steps = Array.from({ length: opacitySteps + 1 }, () => [] as number[]);
      for (let first = 0; first < nodes.length; first += 1) {
        for (let second = first + 1; second < nodes.length; second += 1) {
          if (!isLinked(nodes[first]!, nodes[second]!, reach)) continue;
          const step = Math.round(Math.min(weights[first]!, weights[second]!) * opacitySteps);
          if (step > 0) steps[step]!.push(first, second);
        }
      }
      context.lineWidth = 1;
      steps.forEach((pairs, step) => {
        if (pairs.length === 0) return;
        context.strokeStyle = `rgba(255, 255, 255, ${(0.85 * step) / opacitySteps})`;
        context.beginPath();
        for (let index = 0; index < pairs.length; index += 2) {
          context.moveTo(nodes[pairs[index]!]!.x, nodes[pairs[index]!]!.y);
          context.lineTo(nodes[pairs[index + 1]!]!.x, nodes[pairs[index + 1]!]!.y);
        }
        context.stroke();
      });

      const phase = (time % pulseDuration) / pulseDuration;
      const pulse = 9 + phase * 26;
      for (const faint of [false, true]) {
        context.strokeStyle = `rgba(255, 255, 255, ${0.55 * (1 - phase) * (faint ? bodiedNetworkOpacity : 1)})`;
        context.beginPath();
        for (const point of network.held.values()) {
          if (bodied.has(point.session) !== faint) continue;
          context.moveTo(point.x + pulse, point.y);
          context.arc(point.x, point.y, pulse, 0, Math.PI * 2);
        }
        context.stroke();
      }
      // Node rings and dots are batched by the same opacity steps as edges.
      for (const members of nodeSteps) members.length = 0;
      weights.forEach((weight, index) => {
        const step = Math.round(weight * opacitySteps);
        if (step > 0) nodeSteps[step]!.push(nodes[index]!);
      });
      context.fillStyle = "#fff";
      nodeSteps.forEach((members, step) => {
        if (members.length === 0) return;
        context.globalAlpha = step / opacitySteps;
        context.strokeStyle = "rgba(255, 255, 255, 0.72)";
        context.beginPath();
        for (const point of members) {
          context.moveTo(point.x + 8, point.y);
          context.arc(point.x, point.y, 8, 0, Math.PI * 2);
        }
        context.stroke();
        context.beginPath();
        for (const point of members) {
          context.moveTo(point.x + 3, point.y);
          context.arc(point.x, point.y, 3, 0, Math.PI * 2);
        }
        context.fill();
      });
      context.globalAlpha = 1;

      if (modelRef.current === "love") {
        // Society: people batched by hue bin and life stage, then the hands of every couple, then life events.
        const agents = society.agents;
        settling = settling.filter((entry) => {
          entry.progress = Math.min(1, entry.progress + elapsedSeconds / settleSeconds);
          return entry.progress < 1 && entry.agent.diedAt === null;
        });
        const settlingIds = new Set(settling.map((entry) => entry.agent.id));
        for (const list of agentGroups.values()) list.length = 0;
        const sticks = new Map<number, Stick>();
        for (const agent of agents) {
          const stick = sceneStick(agent, society, stickFor(agent, growthOf(agent), partnerOf(society, agent)?.x ?? null));
          sticks.set(agent.id, stick);
          if (settlingIds.has(agent.id) || agent.diedAt !== null) continue;
          const key = colorKey(agent);
          const list = agentGroups.get(key) ?? [];
          list.push(stick);
          agentGroups.set(key, list);
        }
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = agentStickWidth;
        for (const [key, list] of agentGroups) {
          if (list.length === 0) continue;
          context.strokeStyle = keyColor(key);
          context.beginPath();
          for (const stick of list) traceStick(context, stick, agentHeadMinimum);
          context.stroke();
        }
        // The dead lie down and fade where they fell.
        for (const agent of agents) {
          if (agent.diedAt === null) continue;
          const t = Math.min(1, (society.time - agent.diedAt) / DEFAULT_SOCIETY.eventMemory);
          const stick = sticks.get(agent.id)!;
          context.globalAlpha = 1 - t;
          context.strokeStyle = keyColor(colorKey(agent));
          context.beginPath();
          traceStick(context, { ...stick, frame: { ...stick.frame, angle: (Math.PI / 2) * Math.min(1, t * 2) } }, agentHeadMinimum);
          context.stroke();
        }
        context.globalAlpha = 1;
        // Partners hold hands: a white line joins the facing hands of every couple.
        context.lineWidth = 2;
        context.strokeStyle = "#fff";
        context.beginPath();
        for (const agent of agents) {
          const partner = partnerOf(society, agent);
          if (!partner || agent.id > partner.id || settlingIds.has(agent.id) || settlingIds.has(partner.id)) continue;
          if ((agent.act && agent.act.until > society.time) || (partner.act && partner.act.until > society.time)) continue;
          const [left, right] = agent.x <= partner.x ? [agent, partner] : [partner, agent];
          const leftStick = sticks.get(left.id)!;
          const rightStick = sticks.get(right.id)!;
          const from = toWorld(leftStick.frame, leftStick.pose.rightHand);
          const to = toWorld(rightStick.frame, rightStick.pose.leftHand);
          context.moveTo(from.x, from.y);
          context.lineTo(to.x, to.y);
        }
        context.stroke();
        // A settling person shrinks from its touch-sized pose into its walking self, taking on its lineage hue.
        for (const { agent, from, progress } of settling) {
          const eased = progress * progress * (3 - 2 * progress);
          const target = sticks.get(agent.id)!;
          const body = mixFrame(from.frame, target.frame, eased);
          const endpoints = mixEndpoints(from.endpoints, walkEndpoints(agent, partnerOf(society, agent)?.x ?? null), eased);
          context.lineWidth = stickWidth + (agentStickWidth - stickWidth) * eased;
          context.strokeStyle = mixColor([255, 255, 255], hueRgb(colorKey(agent)), eased);
          context.beginPath();
          traceStick(context, { frame: body, pose: buildPose(endpoints) }, agentHeadMinimum * eased);
          context.stroke();
        }
        drawEvents(context, society);
        for (const event of society.events) {
          if (event.time <= lastEventTime) continue;
          recent.push({ kind: event.kind === "split" && event.betrayal ? "betrayal" : event.kind, time: event.time });
          if (event.kind === "kiss") sound.kiss(panOf(event.x));
          else if (event.kind === "slap") sound.slap(panOf(event.x));
          else if (event.kind === "split" && event.betrayal) sound.shatter(panOf(event.x));
          else if (event.kind === "birth") sound.cry(panOf(event.x));
          else if (event.kind === "death") sound.requiem();
        }
        lastEventTime = society.time;
        while (recent.length > 0 && society.time - recent[0]!.time > rateYears * SECONDS_PER_YEAR) recent.shift();
        if (time - lastReadoutTime >= readoutInterval) {
          lastReadoutTime = time;
          describeSociety(readout, society, recent);
        }
      } else {
        drawPolitics();
      }

      // Touch-sized people over everything, one stroke for all of them.
      context.lineWidth = stickWidth;
      personSteps.forEach((people, step) => {
        if (people.length === 0) return;
        context.strokeStyle = `rgba(255, 255, 255, ${step / opacitySteps})`;
        context.beginPath();
        for (const stick of people) traceStick(context, stick, 0);
        context.stroke();
      });
      context.lineCap = "butt";
      context.lineJoin = "miter";

      const population = modelRef.current === "love" ? society.agents.length : politics.citizens.length;
      if (nodes.length > 0 || population > 0) frame = window.requestAnimationFrame(paint);
      else {
        previousTime = 0;
        setHasNodes(false);
      }
    };

    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(paint);
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      schedule();
    };

    const position = (clientX: number, clientY: number, bounds: DOMRect): Point => ({
      x: Math.max(0, Math.min(width, clientX - bounds.left)),
      y: Math.max(0, Math.min(height, clientY - bounds.top)),
    });

    const apply = (type: ContactEvent, changes: { identifier: number; x: number; y: number }[]) => {
      // Every touch is a user gesture, the moment browsers allow audio to start.
      sound.unlock();
      applyContactChanges(network, type, changes, performance.now());
      if (network.nodes.length > 0) setHasNodes(true);
      schedule();
    };

    // Touches on the option controls stay native so their taps still click; every other touch is a node.
    const onControls = (touch: Touch) => touch.target instanceof Node && (controlsRef.current?.contains(touch.target) ?? false);
    const syncTouches = (event: TouchEvent) => {
      const touches = Array.from(event.changedTouches).filter((touch) => !onControls(touch));
      if (touches.length === 0) return;
      event.preventDefault();
      const bounds = canvas.getBoundingClientRect();
      apply(
        event.type as ContactEvent,
        touches.map((touch) => ({ identifier: touch.identifier, ...position(touch.clientX, touch.clientY, bounds) })),
      );
    };

    const onDown = (event: PointerEvent) => {
      if (useTouchEvents && event.pointerType === "touch") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      heldPointers.add(event.pointerId);
      apply("touchstart", [{ identifier: pointerIdentifier(event), ...position(event.clientX, event.clientY, canvas.getBoundingClientRect()) }]);
    };

    const onMove = (event: PointerEvent) => {
      if (!heldPointers.has(event.pointerId)) return;
      apply("touchmove", [{ identifier: pointerIdentifier(event), ...position(event.clientX, event.clientY, canvas.getBoundingClientRect()) }]);
    };

    const onEnd = (event: PointerEvent) => {
      if (!heldPointers.delete(event.pointerId)) return;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      apply("touchend", [{ identifier: pointerIdentifier(event), x: 0, y: 0 }]);
    };

    const preventGesture = (event: Event) => event.preventDefault();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("touchstart", syncTouches, { passive: false, capture: true });
    document.addEventListener("touchmove", syncTouches, { passive: false, capture: true });
    document.addEventListener("touchend", syncTouches, { passive: false, capture: true });
    document.addEventListener("touchcancel", syncTouches, { passive: false, capture: true });
    document.addEventListener("gesturestart", preventGesture, { passive: false, capture: true });
    document.addEventListener("gesturechange", preventGesture, { passive: false, capture: true });
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onEnd);
    canvas.addEventListener("pointercancel", onEnd);
    canvas.addEventListener("lostpointercapture", onEnd);
    resize();

    return () => {
      observer.disconnect();
      document.removeEventListener("touchstart", syncTouches, true);
      document.removeEventListener("touchmove", syncTouches, true);
      document.removeEventListener("touchend", syncTouches, true);
      document.removeEventListener("touchcancel", syncTouches, true);
      document.removeEventListener("gesturestart", preventGesture, true);
      document.removeEventListener("gesturechange", preventGesture, true);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onEnd);
      canvas.removeEventListener("pointercancel", onEnd);
      canvas.removeEventListener("lostpointercapture", onEnd);
      if (frame !== null) window.cancelAnimationFrame(frame);
      sound.close();
    };
  }, []);

  return (
    <main className={styles.field}>
      <p ref={readoutRef} className={styles.readout} aria-hidden="true" />
      <div ref={controlsRef} className={styles.controls}>
        {optionsOpen &&
          models.map(({ id, label }) => (
            <button key={id} type="button" className={styles.control} aria-pressed={model === id} onClick={() => setModel(id)}>
              {label}
            </button>
          ))}
        <button type="button" className={styles.control} aria-expanded={optionsOpen} onClick={() => setOptionsOpen((value) => !value)}>
          {optionsOpen ? "닫기" : "옵션"}
        </button>
      </div>
      <canvas ref={canvasRef} className={styles.canvas} aria-label="Every touch session raises a stick figure on fading nodes; when the fingers lift it joins the chosen society: a love model where people pair, have children, cheat, divorce, age, and die, or a political landscape where height is opinion, from 하파 at the bottom to 상파 at the top" role="img" />
      {!hasNodes && <p className={styles.instruction}>화면을 여러 손가락으로 터치하세요</p>}
    </main>
  );
}

const midpoint = (a: BodyPoint, b: BodyPoint): BodyPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const roles = ["head", "leftHand", "rightHand", "leftFoot", "rightFoot"] as const;
const copyEndpoints = (endpoints: Endpoints) => Object.fromEntries(roles.map((role) => [role, { ...endpoints[role] }])) as Endpoints;

// Walking people swing arms and legs in opposition; a partnered person reaches its inner hand toward `partnerX`.
function walkEndpoints(walker: Walker, partnerX: number | null): Endpoints {
  const swing = Math.sin(walker.stride) * Math.min(1, Math.hypot(walker.vx, walker.vy) / (DEFAULT_SOCIETY.walkSpeed * 0.6));
  const endpoints: Endpoints = {
    head: { ...restEndpoints.head },
    leftHand: { x: -80 + swing * 40, y: 300 },
    rightHand: { x: 80 - swing * 40, y: 300 },
    leftFoot: { x: restEndpoints.leftFoot.x - swing * 55, y: restEndpoints.leftFoot.y },
    rightFoot: { x: restEndpoints.rightFoot.x + swing * 55, y: restEndpoints.rightFoot.y },
  };
  if (partnerX !== null) {
    if (partnerX >= walker.x) endpoints.rightHand = { x: 125, y: 255 };
    else endpoints.leftHand = { x: -125, y: 255 };
  }
  return endpoints;
}

const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
const TAU = Math.PI * 2;
const degrees = (value: number) => (value * Math.PI) / 180;
const mixPoint = (a: BodyPoint, b: BodyPoint, t: number): BodyPoint => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });
const feetLevel = restEndpoints.leftFoot.y;
const bodyMiddle = (restEndpoints.head.y + restEndpoints.leftFoot.y) / 2;

// Turns a stick about a point on its centre line (body units from the head), then shifts it in pixels.
function pivoted(stick: Stick, angle: number, pivotY: number, dx = 0, dy = 0): Stick {
  const pivot = toWorld(stick.frame, { x: 0, y: pivotY });
  const scale = stick.frame.scale;
  return { pose: stick.pose, frame: { x: pivot.x + Math.sin(angle) * pivotY * scale + dx, y: pivot.y - Math.cos(angle) * pivotY * scale + dy, angle, scale } };
}

// Scenes two people play together: a kiss leans both bodies 15° in from the feet until the faces meet;
// lying down lays both flat, one over the other; a slap swings the inner arm across and snaps the struck head away.
function sceneStick(agent: Agent, society: Society, stick: Stick): Stick {
  const act = agent.act;
  if (!act || act.until <= society.time) return stick;
  const other = society.byId.get(act.with);
  if (!other) return stick;
  const t = society.time - act.from;
  const length = act.until - act.from;
  const side = other.x >= agent.x ? 1 : -1;
  const endpoints = walkEndpoints({ ...agent, vx: 0, vy: 0 }, null);
  const inner = side > 0 ? "rightHand" : "leftHand";
  const outer = side > 0 ? "leftHand" : "rightHand";
  if (act.kind === "kiss") {
    const lean = smooth(t / 0.25) * (1 - smooth((t - length + 0.3) / 0.3));
    endpoints[inner] = mixPoint(endpoints[inner], { x: side * 150, y: 120 }, lean);
    endpoints[outer] = mixPoint(endpoints[outer], { x: side * 30, y: 190 }, lean);
    return pivoted({ frame: stick.frame, pose: buildPose(endpoints) }, side * degrees(15) * lean, feetLevel);
  }
  if (act.kind === "lie") {
    // Not flat: both lean back to about 75° so the bodies stay readable, and rock hard against each other,
    // the one on top out of phase with the one below.
    const down = smooth(t / 0.4) * (1 - smooth((t - length + 0.45) / 0.45));
    const beat = Math.sin(TAU * 3.4 * t + (act.lead ? 0 : Math.PI)) * down;
    const shiver = Math.sin(TAU * 6.8 * t + agent.id) * down;
    endpoints.leftHand = mixPoint(endpoints.leftHand, { x: -95 + 30 * shiver, y: 150 + 60 * beat }, down);
    endpoints.rightHand = mixPoint(endpoints.rightHand, { x: 95 - 30 * shiver, y: 150 - 60 * beat }, down);
    endpoints.leftFoot = mixPoint(endpoints.leftFoot, { x: -95 + 35 * beat, y: 420 }, down);
    endpoints.rightFoot = mixPoint(endpoints.rightFoot, { x: 95 - 35 * beat, y: 420 }, down);
    const scale = stick.frame.scale;
    const angle = -degrees(75) * down + degrees(7) * beat;
    const ground = bodyMiddle * scale * 0.7 * down;
    const thrust = 4 * beat;
    return pivoted({ frame: stick.frame, pose: buildPose(endpoints) }, angle, bodyMiddle, thrust, ground - (act.lead ? 0 : 7 * down) + 2 * shiver);
  }
  const strike = t - (act.lead ? SLAP_HITS[0] : SLAP_HITS[1]);
  const rest = endpoints[inner];
  const raised = { x: side * -10, y: -40 };
  const landed = { x: side * 215, y: 20 };
  if (strike > -0.2 && strike < 0.4) {
    endpoints[inner] = strike < 0 ? mixPoint(rest, raised, smooth((strike + 0.2) / 0.2)) : strike < 0.07 ? mixPoint(raised, landed, smooth(strike / 0.07)) : mixPoint(landed, rest, smooth((strike - 0.07) / 0.33));
  }
  const struck = t - (act.lead ? SLAP_HITS[1] : SLAP_HITS[0]);
  const recoil = struck < 0 ? 0 : smooth(struck / 0.04) * Math.exp(-struck / 0.3);
  return pivoted({ frame: stick.frame, pose: buildPose(endpoints) }, -side * degrees(16) * recoil, feetLevel);
}

// Children grow from about half size to adult size at 16.
const growthOf = (agent: Agent) => (agent.age >= ADULT_AGE ? 1 : 0.45 + 0.55 * (agent.age / ADULT_AGE));

// A walker's point is the middle of its body, between head and feet.
function stickFor(walker: Walker & { y: number }, growth: number, partnerX: number | null): Stick {
  const scale = adultScale * growth;
  const middle = (restEndpoints.head.y + restEndpoints.leftFoot.y) / 2;
  return { frame: { x: walker.x, y: walker.y - middle * scale, angle: 0, scale }, pose: buildPose(walkEndpoints(walker, partnerX)) };
}

const opinionBin = (opinion: number) => Math.round(opinion * opinionBins);

function opinionRgb(bin: number): [number, number, number] {
  const t = Math.abs(bin) / opinionBins;
  const end = bin > 0 ? upperColor : lowerColor;
  return centerColor.map((value, index) => Math.round(mix(value, end[index]!, t))) as [number, number, number];
}

const rgb = ([r, g, b]: readonly number[]) => `rgb(${r}, ${g}, ${b})`;

// Two lines: how the society divides now, then how it talks and how hot the issue is.
function describePolitics(readout: HTMLParagraphElement, politics: Politics) {
  const present = politics.citizens.filter((citizen) => citizen.leftAt === null).length;
  readout.style.opacity = present > 0 ? "1" : "0";
  if (present === 0) return;
  const m = measurePolitics(politics);
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  readout.textContent = [
    `상파 ${percent(m.upper)}  중도 ${percent(m.neutral)}  하파 ${percent(m.lower)}  pop ${present}`,
    `양극화 ${m.polarization.toFixed(2)}  echo ${percent(m.echo)}  cross ${percent(m.crossing)}  α ${politics.controversy.toFixed(1)}`,
  ].join("\n");
}

// Hue shows lineage; colour pales with old age (from 55, strongly from 70).
function colorKey(agent: Agent) {
  const stage = agent.age < 55 ? 0 : agent.age < 70 ? 1 : 2;
  return `${Math.round(agent.trait / hueBin) % (360 / hueBin)}:${stage}`;
}

function hueRgb(key: string): [number, number, number] {
  const [bin, stage] = key.split(":").map(Number) as [number, number];
  const hue = bin * hueBin;
  const saturation = [0.72, 0.4, 0.14][stage]!;
  const lightness = [0.62, 0.7, 0.78][stage]!;
  const amount = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    return Math.round(255 * (lightness - amount * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [channel(0), channel(8), channel(4)];
}

const keyColor = (key: string) => {
  const [r, g, b] = hueRgb(key);
  return `rgb(${r}, ${g}, ${b})`;
};

// Two lines in the society's own terms: who is alive now, then what happened per ten years lately.
function describeSociety(readout: HTMLParagraphElement, society: Society, recent: readonly { kind: string; time: number }[]) {
  const living = society.agents.filter((agent) => agent.diedAt === null);
  readout.style.opacity = living.length > 0 ? "1" : "0";
  if (living.length === 0) return;
  const couples = living.filter((agent) => agent.partner !== null && agent.id < agent.partner).length;
  const children = living.filter((agent) => agent.age < ADULT_AGE).length;
  const generation = Math.max(...living.map((agent) => agent.generation));
  const lineages = new Set(living.map((agent) => Math.round(agent.trait / 30) % 12)).size;
  const span = Math.min(rateYears, society.time / SECONDS_PER_YEAR) / 10 || 1;
  const per = (kind: string) => (recent.filter((event) => event.kind === kind).length / span).toFixed(1);
  const splits = (recent.filter((event) => event.kind === "split" || event.kind === "betrayal").length / span).toFixed(1);
  readout.textContent = [
    `yr ${Math.floor(society.time / SECONDS_PER_YEAR)}  pop ${living.length}  pairs ${couples}  kids ${children}  gen ${generation}  lineages ${lineages}`,
    `10y  born ${per("birth")}  died ${per("death")}  wed ${per("union")}  split ${splits}  cheat ${per("betrayal")}`,
  ].join("\n");
}

// Unions raise a heart, partings split one (red for betrayal), births ring the newborn once.
function drawEvents(context: CanvasRenderingContext2D, society: Society) {
  context.lineWidth = 1.5;
  for (const event of society.events) {
    const t = (society.time - event.time) / DEFAULT_SOCIETY.eventMemory;
    context.globalAlpha = 1 - t;
    if (event.kind === "union") {
      context.fillStyle = "#ff5f7a";
      heart(context, event.x, event.y - 46 - t * 18, 7 + t * 3, 0);
      context.fill();
    } else if (event.kind === "split") {
      context.fillStyle = event.betrayal ? "#ff3b30" : "#9a9a9a";
      for (const side of [-1, 1]) {
        heart(context, event.x + side * t * 10, event.y - 46, 7, side);
        context.fill();
      }
    } else if (event.kind === "birth") {
      context.strokeStyle = "#fff";
      context.beginPath();
      context.arc(event.x, event.y - 6, 6 + t * 22, 0, Math.PI * 2);
      context.stroke();
    }
  }
  context.globalAlpha = 1;
}

// A heart of the given size centred at (x, y); `half` −1 or 1 draws only that half, 0 the whole heart.
function heart(context: CanvasRenderingContext2D, x: number, y: number, size: number, half: number) {
  context.beginPath();
  if (half <= 0) {
    context.moveTo(x, y + size);
    context.bezierCurveTo(x - size * 1.4, y, x - size * 1.1, y - size * 1.1, x, y - size * 0.4);
    context.lineTo(x, y + size);
  }
  if (half >= 0) {
    context.moveTo(x, y + size);
    context.bezierCurveTo(x + size * 1.4, y, x + size * 1.1, y - size * 1.1, x, y - size * 0.4);
    context.lineTo(x, y + size);
  }
}

function mixFrame(a: Frame, b: Frame, t: number): Frame {
  const turn = Math.atan2(Math.sin(b.angle - a.angle), Math.cos(b.angle - a.angle));
  return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), angle: a.angle + turn * t, scale: mix(a.scale, b.scale, t) };
}

function mixEndpoints(a: Endpoints, b: Endpoints, t: number): Endpoints {
  return Object.fromEntries(roles.map((role) => [role, { x: mix(a[role].x, b[role].x, t), y: mix(a[role].y, b[role].y, t) }])) as Endpoints;
}

function mixColor(from: [number, number, number], to: [number, number, number], t: number) {
  return `rgb(${from.map((value, index) => Math.round(mix(value, to[index]!, t))).join(", ")})`;
}

// Adds one stick figure (head circle, spine, two-segment arms and legs) to the current path.
function traceStick(context: CanvasRenderingContext2D, { frame: body, pose }: Stick, headMinimum: number) {
  const at = (point: BodyPoint) => toWorld(body, point);
  const head = at(pose.head);
  const neck = at(pose.neck);
  const radius = Math.max(headMinimum, headRadius * pose.scale * body.scale);
  const reach = Math.hypot(neck.x - head.x, neck.y - head.y) || 1;
  const shoulders = at({ x: (pose.leftShoulder.x + pose.rightShoulder.x) / 2, y: pose.leftShoulder.y });
  const pelvis = at(pose.pelvis);
  context.moveTo(head.x + radius, head.y);
  context.arc(head.x, head.y, radius, 0, Math.PI * 2);
  context.moveTo(head.x + ((neck.x - head.x) * radius) / reach, head.y + ((neck.y - head.y) * radius) / reach);
  context.lineTo(pelvis.x, pelvis.y);
  for (const [elbow, hand] of [[pose.leftElbow, pose.leftHand], [pose.rightElbow, pose.rightHand]] as const) {
    context.moveTo(shoulders.x, shoulders.y);
    const bend = at(elbow);
    const end = at(hand);
    context.lineTo(bend.x, bend.y);
    context.lineTo(end.x, end.y);
  }
  for (const [knee, foot] of [[pose.leftKnee, pose.leftFoot], [pose.rightKnee, pose.rightFoot]] as const) {
    context.moveTo(pelvis.x, pelvis.y);
    const bend = at(knee);
    const end = at(foot);
    context.lineTo(bend.x, bend.y);
    context.lineTo(end.x, end.y);
  }
}
