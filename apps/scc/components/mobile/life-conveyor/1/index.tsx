"use client";

import { useEffect, useRef } from "react";
import { bodyHeight, poseAt, statureAt, type Point } from "./model/figure";
import { arrivalSeconds, createPopulation, fallSeconds, lifespan, spouseOf, step, yearsPerSecond, type Person } from "./model/life";
import styles from "./screen.module.css";

const maximumPixelRatio = 1.5;
const rows = 10;
const yearsPerRow = lifespan / rows;
// Adult height as a share of a row; the belt and the gap above the heads take the rest.
const adultShare = 0.66;
const stickWidth = 1.5;
// A married couple stands this far apart (rest-body units), close enough to join hands.
const coupleGap = 240;
// Where joined hands meet, above the feet (rest-body units of an average adult).
const holdHeight = 215;
const followRate = 8;
const bubbleSeconds = 2.6;
const bubbleFade = 0.35;
const bubbleFont = '500 11px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
const bubbleHeight = 17;
const bubblePadding = 5;
// One bubble per this many square pixels of screen at most, so the lines stay readable.
const bubbleArea = 40000;

type Bubble = { id: number; text: string; born: number; width: number; anchor: Point };
type Rect = { x: number; y: number; width: number; height: number };

export default function MobileLifeConveyorOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!context) return;

    const population = createPopulation();
    const shown = new Map<number, { x: number; row: number }>();
    const departures = new Map<number, Point>();
    const heads = new Map<number, { x: number; y: number; radius: number }>();
    let bubbles: Bubble[] = [];
    let width = 1;
    let height = 1;
    let rowHeight = 1;
    let belt = 4;
    let left = 16;
    let right = 16;
    let frame: number | null = null;
    let previousTime = 0;
    let clock = 0;

    // Row 0 (ages 0–9) at the bottom, row 9 (90–100) at the top; each row runs left to right.
    const beltTop = (row: number) => height - row * rowHeight - rowHeight * 0.1 - belt;
    const run = () => right - left - belt * 2;
    const rowOf = (age: number) => Math.min(rows - 1, Math.floor(age / yearsPerRow));
    const xOf = (age: number) => left + belt + ((age - rowOf(age) * yearsPerRow) / yearsPerRow) * run();
    const adult = () => (rowHeight * adultShare) / bodyHeight;
    const scaleOf = (person: Person) => adult() * person.stature * statureAt(person.age);

    const traceFigure = (person: Person, base: Point, scale: number, angle: number, hold?: { left?: Point; right?: Point }) => {
      const pose = poseAt(person.age, person.reach, hold);
      const cos = Math.cos(angle) * scale;
      const sin = Math.sin(angle) * scale;
      // Local units have the feet on y = bodyHeight; the feet's midpoint stands on the belt.
      const at = (point: Point) => {
        const y = point.y - bodyHeight;
        return { x: base.x + cos * point.x - sin * y, y: base.y + sin * point.x + cos * y };
      };
      const head = at(pose.head);
      const neck = at(pose.neck);
      const radius = pose.headRadius * scale;
      const span = Math.hypot(neck.x - head.x, neck.y - head.y) || 1;
      const shoulders = at(pose.shoulders);
      const pelvis = at(pose.pelvis);
      context.moveTo(head.x + radius, head.y);
      context.arc(head.x, head.y, radius, 0, Math.PI * 2);
      const throat = Math.min(1, radius / span);
      context.moveTo(head.x + (neck.x - head.x) * throat, head.y + (neck.y - head.y) * throat);
      context.lineTo(shoulders.x, shoulders.y);
      context.lineTo(pelvis.x, pelvis.y);
      for (const [from, joint, end] of [
        [shoulders, pose.leftElbow, pose.leftHand],
        [shoulders, pose.rightElbow, pose.rightHand],
        [pelvis, pose.leftKnee, pose.leftFoot],
        [pelvis, pose.rightKnee, pose.rightFoot],
      ] as const) {
        const bend = at(joint);
        const tip = at(end);
        context.moveTo(from.x, from.y);
        context.lineTo(bend.x, bend.y);
        context.lineTo(tip.x, tip.y);
      }
      heads.set(person.id, { x: head.x, y: head.y, radius });
    };

    // Where a couple's joined hands meet, or null while they are not standing side by side.
    const handsOf = (person: Person): Point | null => {
      const spouse = spouseOf(population, person);
      const mine = shown.get(person.id);
      const theirs = spouse ? shown.get(spouse.id) : undefined;
      if (!spouse || spouse.arriving !== null || !mine || !theirs || mine.row !== theirs.row) return null;
      if (Math.abs(mine.x - theirs.x) > coupleGap * adult() * 1.6) return null;
      return { x: (mine.x + theirs.x) / 2, y: beltTop(mine.row) - holdHeight * adult() };
    };

    const bubbleRect = (bubble: Bubble): Rect => {
      const x = Math.min(width - 2 - bubble.width, bubble.anchor.x + 3);
      return { x: Math.max(2, x), y: Math.max(2, bubble.anchor.y - 3 - bubbleHeight), width: bubble.width, height: bubbleHeight };
    };
    const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width + 2 && b.x < a.x + a.width + 2 && a.y < b.y + b.height + 2 && b.y < a.y + a.height + 2;
    const anchorOf = (id: number): Point | null => {
      const head = heads.get(id);
      return head ? { x: head.x + head.radius * 0.7, y: head.y - head.radius * 0.7 } : null;
    };

    const paint = (time: number) => {
      frame = window.requestAnimationFrame(paint);
      const seconds = previousTime ? Math.min(0.05, (time - previousTime) / 1000) : 0;
      previousTime = time;
      clock += seconds;
      step(population, seconds);
      heads.clear();

      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);

      // Belts: a stadium per row, cleats travelling right at the speed of one row per ten years.
      context.lineWidth = 1;
      context.strokeStyle = "rgba(255, 255, 255, 0.5)";
      context.beginPath();
      for (let row = 0; row < rows; row += 1) {
        const top = beltTop(row);
        const radius = belt / 2;
        context.moveTo(left + radius, top);
        context.lineTo(right - radius, top);
        context.arc(right - radius, top + radius, radius, -Math.PI / 2, Math.PI / 2);
        context.lineTo(left + radius, top + belt);
        context.arc(left + radius, top + radius, radius, Math.PI / 2, (Math.PI * 3) / 2);
      }
      context.stroke();
      const speed = (run() / yearsPerRow) * yearsPerSecond;
      context.setLineDash([1, Math.max(6, belt * 1.6)]);
      context.lineDashOffset = -clock * speed;
      context.strokeStyle = "rgba(255, 255, 255, 0.8)";
      context.lineWidth = belt * 0.5;
      context.beginPath();
      for (let row = 0; row < rows; row += 1) {
        const middle = beltTop(row) + belt / 2;
        context.moveTo(left + belt / 2, middle);
        context.lineTo(right - belt / 2, middle);
      }
      context.stroke();
      context.setLineDash([]);

      // Positions on the belt: a couple rides at the mean of their ages, husband left and wife right.
      const follow = 1 - Math.exp(-seconds * followRate);
      for (const person of population.people) {
        if (person.fallen !== null || person.arriving !== null) continue;
        const spouse = spouseOf(population, person);
        const together = spouse !== null && spouse.arriving === null;
        const age = together ? (person.age + spouse.age) / 2 : person.age;
        const row = rowOf(age);
        const offset = together ? ((person.sex === "m" ? -1 : 1) * coupleGap * adult()) / 2 : 0;
        const target = Math.max(left, Math.min(right, xOf(age) + offset));
        const current = shown.get(person.id);
        if (!current || current.row !== row) shown.set(person.id, { x: target, row });
        else current.x += (target - current.x) * follow;
      }

      // Every living person is one path and one stroke; each fall has its own fading stroke.
      context.lineWidth = stickWidth;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#fff";
      context.beginPath();
      for (const person of population.people) {
        if (person.fallen !== null) continue;
        const scale = scaleOf(person);
        if (person.arriving !== null) {
          // A newborn leaves its parents' joined hands and is carried in an arc to age 0 at the bottom left.
          if (!departures.has(person.id)) {
            const father = person.parents ? population.byId.get(person.parents[0]) : undefined;
            const mother = person.parents ? population.byId.get(person.parents[1]) : undefined;
            const from = (mother && handsOf(mother)) ?? (father && handsOf(father)) ?? null;
            departures.set(person.id, from ? { x: from.x, y: from.y + (bodyHeight - 150) * scale } : { x: xOf(0), y: beltTop(0) });
          }
          const start = departures.get(person.id)!;
          const progress = 1 - person.arriving / arrivalSeconds;
          const eased = progress * progress * (3 - 2 * progress);
          const end = { x: xOf(0), y: beltTop(0) };
          const lift = Math.sin(Math.PI * progress) * rowHeight * 0.8;
          traceFigure(person, { x: start.x + (end.x - start.x) * eased, y: start.y + (end.y - start.y) * eased - lift }, scale, 0);
          continue;
        }
        departures.delete(person.id);
        const place = shown.get(person.id);
        if (!place) continue;
        const base = { x: place.x, y: beltTop(place.row) };
        const hands = handsOf(person);
        const hand = hands ? { x: (hands.x - base.x) / scale, y: bodyHeight + (hands.y - base.y) / scale } : undefined;
        traceFigure(person, base, scale, 0, hand ? (person.sex === "m" ? { right: hand } : { left: hand }) : undefined);
      }
      context.stroke();
      for (const person of population.people) {
        if (person.fallen === null) continue;
        const t = person.fallen;
        const place = shown.get(person.id) ?? { x: xOf(Math.min(person.age, lifespan - 1e-6)), row: rowOf(person.age) };
        // Tipped off the belt: a small step forward, a fall of a row, a turn of the body.
        const base = { x: place.x + t * rowHeight * 0.25, y: beltTop(place.row) + 0.5 * rowHeight * 9 * t * t };
        context.globalAlpha = Math.max(0, 1 - t / fallSeconds);
        context.beginPath();
        traceFigure(person, base, scaleOf(person), t * 2.4);
        context.stroke();
      }
      context.globalAlpha = 1;
      context.lineCap = "butt";
      context.lineJoin = "miter";
      for (const id of shown.keys()) if (!population.byId.has(id)) shown.delete(id);
      for (const id of departures.keys()) if (!population.byId.has(id)) departures.delete(id);

      // Lines: each spoken line becomes a bubble above its speaker's head to the right, if there is room.
      context.font = bubbleFont;
      bubbles = bubbles.filter((bubble) => clock - bubble.born < bubbleSeconds);
      for (const bubble of bubbles) bubble.anchor = anchorOf(bubble.id) ?? bubble.anchor;
      const capacity = Math.max(4, Math.round((width * height) / bubbleArea));
      for (const line of population.lines) {
        const anchor = anchorOf(line.id);
        if (!anchor || bubbles.length >= capacity) continue;
        const bubble = { id: line.id, text: line.text, born: clock, width: context.measureText(line.text).width + bubblePadding * 2, anchor };
        const rect = bubbleRect(bubble);
        if (bubbles.some((other) => overlaps(rect, bubbleRect(other)))) continue;
        bubbles.push(bubble);
      }
      population.lines.length = 0;
      context.lineWidth = 1;
      context.textBaseline = "middle";
      for (const bubble of bubbles) {
        const age = clock - bubble.born;
        context.globalAlpha = Math.max(0, Math.min(1, age / 0.15, (bubbleSeconds - age) / bubbleFade));
        const rect = bubbleRect(bubble);
        const radius = 4;
        const tail = Math.min(rect.x + rect.width - radius - 6, Math.max(rect.x + radius, bubble.anchor.x + 2));
        const bottom = rect.y + rect.height;
        context.beginPath();
        context.moveTo(rect.x + radius, rect.y);
        context.arcTo(rect.x + rect.width, rect.y, rect.x + rect.width, bottom, radius);
        context.arcTo(rect.x + rect.width, bottom, rect.x, bottom, radius);
        context.lineTo(tail + 6, bottom);
        context.lineTo(bubble.anchor.x, bubble.anchor.y);
        context.lineTo(tail, bottom);
        context.arcTo(rect.x, bottom, rect.x, rect.y, radius);
        context.arcTo(rect.x, rect.y, rect.x + rect.width, rect.y, radius);
        context.closePath();
        context.fillStyle = "#000";
        context.fill();
        context.strokeStyle = "#fff";
        context.stroke();
        context.fillStyle = "#fff";
        context.fillText(bubble.text, rect.x + bubblePadding, rect.y + rect.height / 2 + 0.5);
      }
      context.globalAlpha = 1;
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, maximumPixelRatio);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      rowHeight = height / rows;
      belt = Math.max(4, Math.min(8, rowHeight * 0.07));
      // Wide enough margins that an arm span at either end of a belt stays on screen.
      const margin = Math.max(16, rowHeight * adultShare * 0.35 + 4);
      left = margin;
      right = width - margin;
      shown.clear();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    frame = window.requestAnimationFrame(paint);

    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className={styles.field}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="Ten conveyor belts from 0 years at the bottom left to 100 at the top right. Couples ride hand in hand and their children travel to the start; each person's scripted life events appear in speech bubbles until they fall off the belt"
        role="img"
      />
    </main>
  );
}
