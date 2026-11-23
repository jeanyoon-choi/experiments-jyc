"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  createSocialStorySystem,
  INFLUENCE_LIFETIME_MILLISECONDS,
  maintainSocialStoryActivity,
  resizeSocialStorySystem,
  stepSocialStorySystem,
} from "../model/social-stories";
import { loadSocialStorySystem, saveSocialStorySystem } from "../model/session";
import { AttentionSchool, type FieldLayout } from "../model/attention-school";
import { techKeywordAt } from "../model/tech-keywords";
import type { FishColourPaletteId, GoldfishScene, TargetLineShape } from "../rendering/goldfish-scene";
import type { StoryInfluence } from "../model/types";
import styles from "./story-tray.module.css";
import { ApproachEvents } from "../model/approach-events";
import { techPowerBrandPalettes } from "../model/tech-power-brand-palettes";
import { techPowerFaces } from "../model/tech-power-faces.generated";
import { useApproachSound } from "../audio/use-approach-sound";
import { TechHieroglyph } from "./tech-hieroglyph";
import { appServiceAt, appServiceCount, AppServiceMark } from "./app-service-mark";
import { AppSphere3D } from "./app-sphere-3d";
import { SnsActionIcon } from "./sns-action-icon";
import { SnsIcon3D } from "./sns-icon-3d";
import { snsActions, type SnsActionColour } from "../model/sns-actions";
import { TechEyeBlink } from "./tech-eye-blink";
import { createEyeBlinkController } from "../model/eye-blink-controller";
import { TechEye3D, blinkAll3DEyes, set3DEyeBlinkSpeed } from "./tech-eye-3d";
import { techEye3DStudies } from "../model/tech-eye-3d";
import { TechFace3D } from "./tech-face-3d";
import { techFace3DStudies } from "../model/face-3d";
import { TechLips3D } from "./tech-lips-3d";
import { lips3DStudies, lips3DTrialSourceIndices } from "../model/lips-3d";

const REFERENCE_STORY_SIZE = 93;
const DEFAULT_ICON_SIZE = 60;
const MIN_ICON_SIZE = 28;
const MAX_ICON_SIZE = REFERENCE_STORY_SIZE;
const DEFAULT_STORY_GAP = 36;
const EDGE_SCALE_REFERENCE_SIZE = 40;
const LINE_EDGE_WIDTH = 2.15;
const MAX_STORY_GAP = 80;
const SIMULATION_STEP_MILLISECONDS = 210;
const MIN_FISH_COUNT = 150;
const MAX_FISH_COUNT = 600;
const MIN_FISH_SCALE = 0.7;
const MAX_FISH_SCALE = 1.2;
const DEFAULT_FISH_COUNT = 600;
const DEFAULT_FISH_SCALE = 0.7;
const DEFAULT_TRACE_SECONDS = 5;
const DEFAULT_BUBBLE_APPEAR_SECONDS = 0.3;
const DEFAULT_BUBBLE_DISAPPEAR_SECONDS = 0.3;
const MIN_BUBBLE_ANIMATION_SECONDS = 0.05;
const MAX_BUBBLE_APPEAR_SECONDS = 1.2;
const MAX_BUBBLE_DISAPPEAR_SECONDS = 2;
const MIN_ACTIVITY_SPEED = 0.1;
const MAX_ACTIVITY_SPEED = 2;
const DEFAULT_ACTIVITY_SPEED = 0.5;
const DEFAULT_ATTENTION_CAP = 80;
const TECH_IMAGE_ATLAS_URL = "/images/0908/tech-keyword-atlas/tech-keyword-atlas-v1.png";
const TECH_IMAGE_ATLAS_COLUMNS = 6;
const EYE_IMAGE_COUNT = 75;
const EYE_IMAGE_DIRECTORY = "/assets/goldfishes/goldfish-eye-collage-circle-75-svg";
const SESSION_STORAGE_KEY = "goldfishes:0922:default:stories:v1";

type GridSize = {
  columns: number;
  rows: number;
};

type StageSize = {
  width: number;
  height: number;
};

type StorySurface = "empty" | "face" | "eyes" | "lips" | "apps" | "icons" | "hieroglyphs" | "colour" | "techMono" | "tech";
type FaceType = "politician" | "bigTechColour" | "bigTechOriginal" | "bigTechMonochrome";
type EyeType = "human" | "bigTech" | "bigTechColour";
type LipSource = "tech" | "politician" | "mixed";
type LipVersion = "v1" | "v2";
type LipColour = "original" | "sourceColour" | "red";
type TechTypeface = "mono" | "ui" | "image" | "imageMono";
type OverlayParameterPreset = "4" | "5";

type OverlayParameterCombination = Readonly<{
  activitySpeed: number;
  approachRings: boolean;
  fishScale: number;
  iconSize: number;
  storyGap: number;
}>;

const overlayParameterCombinations: Readonly<Record<OverlayParameterPreset, OverlayParameterCombination>> = {
  "4": { activitySpeed: 1, approachRings: true, fishScale: 0.8, iconSize: 50, storyGap: 30 },
  "5": {
    activitySpeed: DEFAULT_ACTIVITY_SPEED,
    approachRings: false,
    fishScale: DEFAULT_FISH_SCALE,
    iconSize: DEFAULT_ICON_SIZE,
    storyGap: DEFAULT_STORY_GAP,
  },
};

type StoryRingPalette = Readonly<{
  id: "transparent" | "instagram" | "rose" | "sunset" | "lilac" | "ocean" | "forest" | "citrus" | "ember" | "dusk" | "monochrome";
  name: string;
  gradient: string;
  previewGradient?: string;
  edgeStart: string;
  edgeMiddle: string;
  edgeEnd: string;
}>;

type FishColourPalette = Readonly<{
  id: FishColourPaletteId;
  name: string;
  gradient: string;
}>;

type TechPaletteGroup = Readonly<{
  paletteId: StoryRingPalette["id"];
  terms: readonly string[];
}>;

type InfluenceGeometry = {
  id: string;
  source: number;
  target: number;
  path: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

const surfaceOptions: readonly { label: string; value: StorySurface }[] = [
  { label: "empty", value: "empty" },
  { label: "face", value: "face" },
  { label: "eyes", value: "eyes" },
  { label: "lips", value: "lips" },
  { label: "apps", value: "apps" },
  { label: "icons", value: "icons" },
  { label: "tech mono", value: "techMono" },
];
const faceTypeOptions: readonly { label: string; value: FaceType }[] = [
  { label: "politician", value: "politician" },
  { label: "big tech colour", value: "bigTechColour" },
  { label: "big tech original", value: "bigTechOriginal" },
  { label: "big tech monochrome", value: "bigTechMonochrome" },
];
const eyeTypeOptions: readonly { label: string; value: EyeType }[] = [
  { label: "human", value: "human" },
  { label: "big tech", value: "bigTech" },
  { label: "big tech colour", value: "bigTechColour" },
];
const lipSourceOptions: readonly { label: string; value: LipSource }[] = [
  { label: "tech", value: "tech" },
  { label: "politician", value: "politician" },
  { label: "tech + politician", value: "mixed" },
];
const lipVersionOptions: readonly { label: string; value: LipVersion }[] = [
  { label: "lips-v1", value: "v1" },
  { label: "lips-v2", value: "v2" },
];
const lipColourOptions: readonly { label: string; value: LipColour }[] = [
  { label: "original", value: "original" },
  { label: "tech / politician colour", value: "sourceColour" },
  { label: "red", value: "red" },
];
const techTypefaceOptions: readonly { label: string; value: TechTypeface }[] = [
  { label: "mono", value: "mono" },
  { label: "ui", value: "ui" },
  { label: "image", value: "image" },
  { label: "image mono", value: "imageMono" },
];
const politicianFaceImages = Array.from(
  { length: 60 },
  (_, index) => `/images/grid-2/politicians/${String(index + 1).padStart(3, "0")}.jpg`,
);
const politicianLean = [
  1, -0.65, -0.45, -0.2, 0, -0.9, -0.75, -0.45, -0.75, -0.8,
  -0.2, 0.6, 0.25, -0.55, 0.6, 0.35, 0, -0.55, 0.1, 0.35,
  -0.45, -0.9, -0.75, 0.9, 0, -0.45, 0.95, 0.45, 0.45, -0.75,
  0.4, -0.65, 0.4, -0.55, -0.35, 0, -0.2, 0.15, -0.45, 0.35,
  0, 0.1, 0.35, -0.75, -0.55, -0.55, -0.65, -0.85, 0, -0.2,
  -0.15, 0.65, 0.85, 0, -0.35, -0.45, -0.9, 0.55, -0.85, 0.25,
] as const;
const egyptianHieroglyphs = Array.from("𓀀𓀁𓀂𓀃𓀄𓀅𓀆𓀇𓀈𓀉𓀊𓀋𓀌𓀍𓀎𓀏𓀐𓀑𓀒𓀓𓀔𓀕𓀖𓀗𓀘𓀙𓀚𓀛𓀜𓀝𓀞𓀟");

function politicianFaceTint(index: number) {
  const lean = politicianLean[index % politicianLean.length]!;
  const from = lean < 0 ? [42, 105, 255] : [139, 94, 164];
  const to = lean < 0 ? [139, 94, 164] : [244, 61, 74];
  const amount = Math.abs(lean);
  return `rgb(${from.map((channel, channelIndex) => Math.round(channel + (to[channelIndex]! - channel) * amount)).join(" ")})`;
}
const storyRingPalettes: readonly StoryRingPalette[] = [
  { id: "transparent", name: "Transparent", gradient: "transparent", previewGradient: "repeating-conic-gradient(#7c8288 0 25%, #25292d 0 50%) 50% / 6px 6px", edgeStart: "#d8dde0", edgeMiddle: "#8b949b", edgeEnd: "#f3f5f6" },
  { id: "instagram", name: "Instagram", gradient: "conic-gradient(from 205deg, #fed044, #ff264f 30%, #ed0e9b 58%, #ff5e29 80%, #fed044)", edgeStart: "#ffbd5b", edgeMiddle: "#fa4aa5", edgeEnd: "#ffd06a" },
  { id: "rose", name: "Rose", gradient: "conic-gradient(from 205deg, #ffc990, #f45b99 30%, #bd4ab9 58%, #ee8a74 80%, #ffc990)", edgeStart: "#ffc49a", edgeMiddle: "#e95f9d", edgeEnd: "#ef9dbe" },
  { id: "sunset", name: "Sunset", gradient: "conic-gradient(from 205deg, #ffe179, #ff993f 30%, #ef5551 58%, #bb4e8a 80%, #ffe179)", edgeStart: "#ffd66f", edgeMiddle: "#f46a4f", edgeEnd: "#ca5793" },
  { id: "lilac", name: "Lilac", gradient: "conic-gradient(from 205deg, #f3b7ff, #c952e8 30%, #7355df 58%, #648de8 80%, #f3b7ff)", edgeStart: "#e6b4ff", edgeMiddle: "#a653e2", edgeEnd: "#6d8ff0" },
  { id: "ocean", name: "Ocean", gradient: "conic-gradient(from 205deg, #87efd5, #2eb7d4 30%, #3f72e4 58%, #776ce7 80%, #87efd5)", edgeStart: "#87efd5", edgeMiddle: "#32a8d6", edgeEnd: "#7473ec" },
  { id: "forest", name: "Forest", gradient: "conic-gradient(from 205deg, #d9ef73, #75c76b 30%, #168c76 58%, #2eaa92 80%, #d9ef73)", edgeStart: "#d1e97c", edgeMiddle: "#54bd7a", edgeEnd: "#2aa991" },
  { id: "citrus", name: "Citrus", gradient: "conic-gradient(from 205deg, #fff36d, #c9e64b 30%, #56bc76 58%, #f2bd43 80%, #fff36d)", edgeStart: "#fff06a", edgeMiddle: "#91d05f", edgeEnd: "#f6c24e" },
  { id: "ember", name: "Ember", gradient: "conic-gradient(from 205deg, #ffc45a, #f86e35 30%, #d94545 58%, #a94d71 80%, #ffc45a)", edgeStart: "#ffbf59", edgeMiddle: "#ed593f", edgeEnd: "#b55075" },
  { id: "dusk", name: "Dusk", gradient: "conic-gradient(from 205deg, #edbb85, #cb688a 30%, #704da7 58%, #426eae 80%, #edbb85)", edgeStart: "#e9b78c", edgeMiddle: "#a8589e", edgeEnd: "#4e72b2" },
  { id: "monochrome", name: "Monochrome", gradient: "conic-gradient(from 205deg, #f3f5f6, #9199a0 30%, #4c555e 58%, #aeb5bb 80%, #f3f5f6)", edgeStart: "#d8dde0", edgeMiddle: "#8b949b", edgeEnd: "#f3f5f6" },
];
const fishColourPalettes: readonly FishColourPalette[] = [
  { id: "classic", name: "Classic goldfish", gradient: "conic-gradient(from 205deg, #f0c16d, #cf741c 38%, #9e4f14 68%, #e7b365 84%, #f0c16d)" },
  { id: "instagram", name: "Instagram", gradient: "conic-gradient(from 205deg, #fed044, #ff264f 30%, #ed0e9b 58%, #ff5e29 80%, #fed044)" },
  { id: "rose", name: "Rose", gradient: "conic-gradient(from 205deg, #ffc990, #f45b99 30%, #bd4ab9 58%, #ee8a74 80%, #ffc990)" },
  { id: "sunset", name: "Sunset", gradient: "conic-gradient(from 205deg, #ffe179, #ff993f 30%, #ef5551 58%, #bb4e8a 80%, #ffe179)" },
  { id: "poppy", name: "Poppy red", gradient: "conic-gradient(from 205deg, #f8a15d, #e83c42 38%, #b8242d 68%, #f15d45 84%, #f8a15d)" },
  { id: "pink", name: "Natural pink", gradient: "conic-gradient(from 205deg, #f6c0a4, #e57687 38%, #b94d66 68%, #ef8d98 84%, #f6c0a4)" },
];
const techPaletteGroups: readonly TechPaletteGroup[] = [
  { paletteId: "instagram", terms: ["AGI", "GPT", "LLM", "RAG"] },
  { paletteId: "lilac", terms: ["AI", "ML", "DL", "NLP"] },
  { paletteId: "ember", terms: ["CPU", "GPU", "NPU", "RAM"] },
  { paletteId: "ocean", terms: ["IoT", "AR", "VR", "XR", "CDN", "DNS", "URL", "VPN"] },
  { paletteId: "forest", terms: ["API", "SDK", "IDE", "OOP", "QA", "DB", "SQL"] },
  { paletteId: "citrus", terms: ["UI", "UX", "HCI", "MVP"] },
  { paletteId: "sunset", terms: ["NFT", "DAO"] },
  { paletteId: "monochrome", terms: ["OS", "PC", "VM"] },
];

function getGridSize(
  width: number,
  height: number,
  storySize: number,
  storyGap: number,
): GridSize {
  return {
    columns: Math.max(1, Math.floor((width + storyGap) / (storySize + storyGap))),
    rows: Math.max(1, Math.floor((height + storyGap) / (storySize + storyGap))),
  };
}

function storyRingPaletteById(id: StoryRingPalette["id"]) {
  return storyRingPalettes.find((palette) => palette.id === id) ?? storyRingPalettes[0]!;
}

function techPaletteForTerm(term: string) {
  const group = techPaletteGroups.find((candidate) => candidate.terms.includes(term));
  return storyRingPaletteById(group?.paletteId ?? "instagram");
}

function techPaletteForIndex(index: number) {
  return techPaletteForTerm(techKeywordAt(index).abbreviation);
}

function techImageStyle(index: number): CSSProperties {
  const tile = index % 36;
  const column = tile % TECH_IMAGE_ATLAS_COLUMNS;
  const row = Math.floor(tile / TECH_IMAGE_ATLAS_COLUMNS);
  return {
    backgroundColor: "#171a1e",
    backgroundImage: `url("${TECH_IMAGE_ATLAS_URL}")`,
    backgroundPosition: `${column / (TECH_IMAGE_ATLAS_COLUMNS - 1) * 100}% ${row / (TECH_IMAGE_ATLAS_COLUMNS - 1) * 100}%`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${TECH_IMAGE_ATLAS_COLUMNS * 100}% ${TECH_IMAGE_ATLAS_COLUMNS * 100}%`,
  };
}

function colourUnit(index: number, seed: number, salt: number) {
  const value = Math.sin((index + 1) * (seed + salt * 19.73)) * 43758.5453123;
  return value - Math.floor(value);
}

function colourFor(index: number, seed: number) {
  const hue = Math.round(colourUnit(index, seed, 1) * 360);
  const saturation = Math.round(52 + colourUnit(index, seed, 2) * 43);
  const lightness = Math.round(33 + colourUnit(index, seed, 3) * 42);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

function eyeImageStyle(index: number): CSSProperties {
  const number = String(index % EYE_IMAGE_COUNT + 1).padStart(3, "0");

  return {
    backgroundColor: "#171a1e",
    backgroundImage: `url("${EYE_IMAGE_DIRECTORY}/goldfish-eye-circle-${number}.svg")`,
    // The source SVGs share one eye crop at (502.175, 165.001), radius 54.
    // Zooming that crop to the bubble keeps only the photographic eye visible.
    backgroundPosition: "90.91% 38.01%",
    backgroundSize: "556.48% 370.37%",
  };
}

function bigTechEyeImageStyle(index: number, withBrandColour: boolean): CSSProperties {
  const person = techPowerFaces[index % techPowerFaces.length]!;
  const image = `url("/images/0908/tech-power-eyes/${person.id}.jpg")`;
  return {
    backgroundColor: "#171a1e",
    backgroundImage: withBrandColour ? `${brandGradient(index)}, ${image}` : image,
    backgroundBlendMode: withBrandColour ? "color, normal" : undefined,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
}

function lipImageStyle(index: number, source: LipSource, version: LipVersion, colour: LipColour): CSSProperties {
  const isTech = source === "tech" || source === "mixed" && index % 2 === 0;
  const sourceIndex = source === "mixed" ? Math.floor(index / 2) : index;
  const personId = isTech
    ? techPowerFaces[sourceIndex % techPowerFaces.length]!.id
    : String(sourceIndex % politicianFaceImages.length + 1).padStart(3, "0");
  const directory = isTech ? "tech-power-lips" : "politician-lips";
  const image = `url("/images/0908/${directory}-${version}/${personId}.jpg")`;
  const baseStyle: CSSProperties = {
    backgroundColor: "#171a1e",
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
  if (colour === "original") return { ...baseStyle, backgroundImage: image };
  if (colour === "sourceColour") {
    const tint = isTech
      ? brandGradient(sourceIndex)
      : `linear-gradient(${politicianFaceTint(sourceIndex)}, ${politicianFaceTint(sourceIndex)})`;
    return { ...baseStyle, backgroundImage: `${tint}, ${image}`, backgroundBlendMode: "color, normal" };
  }
  const highlight = "radial-gradient(ellipse 27% 8% at 43% 57%, rgb(255 222 226 / 32%), transparent 78%)";
  const upperLip = "radial-gradient(ellipse 56% 19% at 50% 42%, rgb(174 4 49 / 82%), transparent 72%)";
  const lowerLip = "radial-gradient(ellipse 58% 21% at 50% 60%, rgb(226 22 75 / 74%), transparent 74%)";
  return {
    ...baseStyle,
    backgroundImage: `${highlight}, ${upperLip}, ${lowerLip}, ${image}`,
    backgroundBlendMode: "screen, soft-light, soft-light, normal",
  };
}

function brandGradient(index: number) {
  const person = techPowerFaces[index % techPowerFaces.length]!;
  const colours = techPowerBrandPalettes[person.affiliation];
  const lastIndex = colours.length - 1;
  const stops = colours.map((colour, colourIndex) => `${colour} ${colourIndex / lastIndex * 100}%`).join(", ");
  return `linear-gradient(135deg, ${stops})`;
}

function getSurfaceStyle(surface: StorySurface, index: number, colourSeed: number, typeface: TechTypeface, faceType: FaceType, eyeType: EyeType, lipSource: LipSource, lipVersion: LipVersion, lipColour: LipColour): CSSProperties {
  if ((surface === "techMono" || surface === "tech") && (typeface === "image" || typeface === "imageMono")) {
    const image = techImageStyle(index);
    return typeface === "imageMono" ? { ...image, filter: "grayscale(1) contrast(1.08) brightness(0.88)" } : image;
  }
  if (surface === "empty" || surface === "apps" || surface === "icons" || surface === "hieroglyphs" || surface === "techMono" || surface === "tech") return { backgroundColor: "#171a1e" };
  if (surface === "face") {
    const isPolitician = faceType === "politician";
    const image = isPolitician ? politicianFaceImages[index % politicianFaceImages.length]! : techPowerFaces[index % techPowerFaces.length]!.image;
    const imageStyle = { backgroundImage: `url("${image}")`, backgroundSize: "cover" };
    if (faceType === "bigTechOriginal") return imageStyle;
    if (faceType === "bigTechMonochrome") return { ...imageStyle, filter: "grayscale(1) contrast(1.06)" };
    const tint = isPolitician ? `linear-gradient(${politicianFaceTint(index)}, ${politicianFaceTint(index)})` : brandGradient(index);
    return { ...imageStyle, backgroundImage: `${tint}, url("${image}")`, backgroundBlendMode: "color, normal" };
  }
  if (surface === "eyes") return eyeType === "human" ? eyeImageStyle(index) : bigTechEyeImageStyle(index, eyeType === "bigTechColour");
  if (surface === "lips") return lipImageStyle(index, lipSource, lipVersion, lipColour);
  if (surface === "colour") return { backgroundColor: colourFor(index, colourSeed) };
  return { backgroundColor: "#171a1e" };
}

function TechMark({ term, typeface }: { term: string; typeface: TechTypeface }) {
  const typefaceClassName = typeface === "ui" ? styles.techMarkUi : styles.techMarkMono;

  return (
    <svg aria-hidden="true" className={`${styles.techMark} ${typefaceClassName}`} viewBox="0 0 100 100">
      <text className={term.length === 3 ? styles.techMarkThree : undefined} dominantBaseline="central" textAnchor="middle" x="50" y="50">{term}</text>
    </svg>
  );
}

function HieroglyphMark({ glyph }: { glyph: string }) {
  const textRef = useRef<SVGTextElement>(null);

  useLayoutEffect(() => {
    let disposed = false;
    const centerGlyph = () => {
      if (disposed) return;
      const text = textRef.current;
      if (!text) return;
      try {
        const bounds = text.getBBox();
        text.setAttribute("transform", `translate(${50 - bounds.x - bounds.width / 2} ${50 - bounds.y - bounds.height / 2})`);
      } catch {
        // A detached SVG may reject getBBox during a rapid surface change.
      } finally {
        text.style.opacity = "1";
      }
    };

    centerGlyph();
    void document.fonts.ready.then(centerGlyph);
    return () => { disposed = true; };
  }, [glyph]);

  return <svg aria-hidden="true" className={styles.hieroglyphMark} preserveAspectRatio="xMidYMid meet" viewBox="0 0 100 100"><text ref={textRef} textAnchor="middle" x="0" y="0">{glyph}</text></svg>;
}

function storyCenter(
  index: number,
  stage: StageSize,
  grid: GridSize,
  storySize: number,
  storyGap: number,
) {
  const gridWidth = grid.columns * storySize + (grid.columns - 1) * storyGap;
  const gridHeight = grid.rows * storySize + (grid.rows - 1) * storyGap;
  const column = index % grid.columns;
  const row = Math.floor(index / grid.columns);

  return {
    x: (stage.width - gridWidth) / 2 + storySize / 2 + column * (storySize + storyGap),
    y: (stage.height - gridHeight) / 2 + storySize / 2 + row * (storySize + storyGap),
  };
}

function getInfluenceGeometry(
  influence: StoryInfluence,
  stage: StageSize,
  grid: GridSize,
  storySize: number,
  storyGap: number,
  sourceScale: number,
  targetScale: number,
): InfluenceGeometry | null {
  const source = storyCenter(influence.source, stage, grid, storySize, storyGap);
  const target = storyCenter(influence.target, stage, grid, storySize, storyGap);
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance < 1) return null;

  const unitX = deltaX / distance;
  const unitY = deltaY / distance;
  const sourceEdgeOffset = Math.min(storySize * sourceScale * 0.48, distance * 0.28);
  const targetEdgeOffset = Math.min(storySize * targetScale * 0.48, distance * 0.28);
  const startX = source.x + unitX * sourceEdgeOffset;
  const startY = source.y + unitY * sourceEdgeOffset;
  const endX = target.x - unitX * targetEdgeOffset;
  const endY = target.y - unitY * targetEdgeOffset;
  const bendDirection = (influence.source * 17 + influence.target * 13) % 2 === 0 ? 1 : -1;
  const bend = Math.min(18, distance * 0.16) * bendDirection;
  const controlX = (startX + endX) / 2 - unitY * bend;
  const controlY = (startY + endY) / 2 + unitX * bend;

  return {
    id: influence.id,
    source: influence.source,
    target: influence.target,
    path: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
    startX,
    startY,
    endX,
    endY,
  };
}

export function InstagramSocialStoryTray() {
  const sound = useApproachSound();
  const soundEngine = sound.engine;
  const gridRef = useRef<HTMLUListElement>(null);
  const ringCanvasRef = useRef<HTMLCanvasElement>(null);
  const traceCanvasRef = useRef<HTMLCanvasElement>(null);
  const fishCanvasRef = useRef<HTMLCanvasElement>(null);
  const schoolRef = useRef<AttentionSchool | null>(null);
  const [gridSize, setGridSize] = useState<GridSize>({ columns: 1, rows: 1 });
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [testSurface, setTestSurface] = useState<StorySurface>("eyes");
  const [apps3DEnabled, setApps3DEnabled] = useState(false);
  const [apps3DRotating, setApps3DRotating] = useState(true);
  const [apps3DStudyIndex, setApps3DStudyIndex] = useState(0);
  const [icons3DEnabled, setIcons3DEnabled] = useState(false);
  const [icons3DColour, setIcons3DColour] = useState<SnsActionColour>("monochrome");
  const [icons3DStudyIndex, setIcons3DStudyIndex] = useState(0);
  const [faceType, setFaceType] = useState<FaceType>("bigTechColour");
  const [face3DTrialEnabled, setFace3DTrialEnabled] = useState(false);
  const [face3DStudyIndex, setFace3DStudyIndex] = useState(0);
  const [eyeType, setEyeType] = useState<EyeType>("bigTechColour");
  const [eyeBlinkEnabled, setEyeBlinkEnabled] = useState(true);
  const [eyeBlinkController] = useState(createEyeBlinkController);
  const [eye3DEnabled, setEye3DEnabled] = useState(false);
  const [eye3DBlinking, setEye3DBlinking] = useState(false);
  const [eye3DBlinkSpeed, setEye3DBlinkSpeed] = useState(0.7);
  const [eye3DStudyIndex, setEye3DStudyIndex] = useState(0);
  const [lipSource, setLipSource] = useState<LipSource>("tech");
  const [lipVersion, setLipVersion] = useState<LipVersion>("v1");
  const [lips3DTrialEnabled, setLips3DTrialEnabled] = useState(false);
  const [lips3DStudyIndex, setLips3DStudyIndex] = useState(0);
  const [lipColour, setLipColour] = useState<LipColour>("original");
  const [techTypeface, setTechTypeface] = useState<TechTypeface>("image");
  const [hieroglyphSet, setHieroglyphSet] = useState<"default" | "tech">("default");
  const [iconSize, setIconSize] = useState(DEFAULT_ICON_SIZE);
  const [storyGap, setStoryGap] = useState(DEFAULT_STORY_GAP);
  const [showTraces, setShowTraces] = useState(false);
  const showTracesRef = useRef(false);
  const [traceDurationSeconds, setTraceDurationSeconds] = useState(DEFAULT_TRACE_SECONDS);
  const traceDurationRef = useRef(DEFAULT_TRACE_SECONDS);
  const [bubbleAppearSeconds, setBubbleAppearSeconds] = useState(DEFAULT_BUBBLE_APPEAR_SECONDS);
  const bubbleAppearSecondsRef = useRef(DEFAULT_BUBBLE_APPEAR_SECONDS);
  const [bubbleDisappearSeconds, setBubbleDisappearSeconds] = useState(DEFAULT_BUBBLE_DISAPPEAR_SECONDS);
  const bubbleDisappearSecondsRef = useRef(DEFAULT_BUBBLE_DISAPPEAR_SECONDS);
  const [influenceOpacity, setInfluenceOpacity] = useState(1);
  const [bubblesPaused, setBubblesPaused] = useState(false);
  const bubblesPausedRef = useRef(false);
  const [activeBubbleTarget, setActiveBubbleTarget] = useState<number | null>(null);
  const activeBubbleTargetRef = useRef<number | null>(null);
  const [activitySpeed, setActivitySpeed] = useState(DEFAULT_ACTIVITY_SPEED);
  const activitySpeedRef = useRef(DEFAULT_ACTIVITY_SPEED);
  const [showTargetLines, setShowTargetLines] = useState(false);
  const showTargetLinesRef = useRef(false);
  const [showApproachRings, setShowApproachRings] = useState(false);
  const showApproachRingsRef = useRef(false);
  const [targetLineShape, setTargetLineShape] = useState<TargetLineShape>("straight");
  const targetLineShapeRef = useRef<TargetLineShape>("straight");
  const [showOriginMarks, setShowOriginMarks] = useState(false);
  const [fishPaletteId, setFishPaletteId] = useState<FishColourPaletteId>("instagram");
  const fishPaletteIdRef = useRef<FishColourPaletteId>("instagram");
  const [jakarta, setJakarta] = useState(true);
  const [jakartaAmount, setJakartaAmount] = useState(100);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [fishCount, setFishCount] = useState(DEFAULT_FISH_COUNT);
  const [fishScale, setFishScale] = useState(DEFAULT_FISH_SCALE);
  const [attentionCapEnabled, setAttentionCapEnabled] = useState(false);
  const [attentionCap, setAttentionCap] = useState(DEFAULT_ATTENTION_CAP);
  const attentionCapRef = useRef<number | null>(null);
  const [colourSeed] = useState(() => Math.random() * 100000);
  const [ringPaletteId, setRingPaletteId] = useState<StoryRingPalette["id"]>("monochrome");
  const [system, setSystem] = useState(() => createSocialStorySystem(1, 1));
  const systemRef = useRef(system);
  const simulationTimeRef = useRef(0);
  const [gridReady, setGridReady] = useState(false);
  const fishLayoutRef = useRef<FieldLayout>({ width: 1, height: 1, columns: 1, rows: 1, iconSize: DEFAULT_ICON_SIZE, gap: DEFAULT_STORY_GAP });
  const selectedRingPalette = storyRingPaletteById(ringPaletteId);
  const edgeWidth = LINE_EDGE_WIDTH * iconSize / EDGE_SCALE_REFERENCE_SIZE;
  const surfaceStyles = useMemo(() => system.nodes.map((story) => getSurfaceStyle(
    testSurface,
    story.index,
    colourSeed,
    techTypeface,
    faceType,
    eyeType,
    lipSource,
    lipVersion,
    lipColour,
  )), [colourSeed, eyeType, faceType, lipColour, lipSource, lipVersion, system.nodes, techTypeface, testSurface]);
  const techKeywords = useMemo(() => system.nodes.map((story) => techKeywordAt(story.index)), [system.nodes]);
  const updateActivitySpeed = (next: number) => {
    activitySpeedRef.current = next;
    setActivitySpeed(next);
  };
  const updateApproachRings = (next: boolean) => {
    showApproachRingsRef.current = next;
    setShowApproachRings(next);
    if (next && showTargetLinesRef.current) {
      showTargetLinesRef.current = false;
      setShowTargetLines(false);
    }
  };
  const updateFishScale = (next: number) => setFishScale(next);
  const updateIconSize = (next: number) => setIconSize(next);
  const updateStoryGap = (next: number) => setStoryGap(next);
  const activeParameterPreset: OverlayParameterPreset | null = (
    activitySpeed === overlayParameterCombinations["5"].activitySpeed
    && showApproachRings === overlayParameterCombinations["5"].approachRings
    && fishScale === overlayParameterCombinations["5"].fishScale
    && iconSize === overlayParameterCombinations["5"].iconSize
    && storyGap === overlayParameterCombinations["5"].storyGap
  ) ? "5" : (
    activitySpeed === overlayParameterCombinations["4"].activitySpeed
    && showApproachRings === overlayParameterCombinations["4"].approachRings
    && fishScale === overlayParameterCombinations["4"].fishScale
    && iconSize === overlayParameterCombinations["4"].iconSize
    && storyGap === overlayParameterCombinations["4"].storyGap
  ) ? "4" : null;

  const applyParameterPreset = (preset: OverlayParameterPreset) => {
    const combination = overlayParameterCombinations[preset];
    updateActivitySpeed(combination.activitySpeed);
    updateApproachRings(combination.approachRings);
    updateFishScale(combination.fishScale);
    updateIconSize(combination.iconSize);
    updateStoryGap(combination.storyGap);
  };

  useEffect(() => {
    systemRef.current = system;
    fishLayoutRef.current = { width: stageSize.width || 1, height: stageSize.height || 1, columns: gridSize.columns, rows: gridSize.rows, iconSize, gap: storyGap };
  }, [gridSize, iconSize, stageSize, storyGap, system]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const updateGridSize = () => {
      const nextStage = { width: grid.clientWidth, height: grid.clientHeight };
      const nextGrid = getGridSize(
        nextStage.width,
        nextStage.height,
        iconSize,
        storyGap,
      );
      setStageSize((current) => (
        current.width === nextStage.width && current.height === nextStage.height ? current : nextStage
      ));
      setGridSize((current) => (
        current.columns === nextGrid.columns && current.rows === nextGrid.rows ? current : nextGrid
      ));
      setGridReady(true);
    };

    updateGridSize();
    const observer = new ResizeObserver(updateGridSize);
    observer.observe(grid);

    return () => observer.disconnect();
  }, [iconSize, storyGap]);

  useEffect(() => {
    const stored = loadSocialStorySystem(SESSION_STORAGE_KEY);
    if (!stored) return;
    systemRef.current = stored.system;
    simulationTimeRef.current = stored.time;
    // Client-only storage cannot seed the SSR snapshot; restore it before the
    // grid-resize effect reads systemRef so the persisted topology is retained.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSystem(stored.system);
  }, []);

  useEffect(() => {
    if (!gridReady) return;
    const nextSystem = resizeSocialStorySystem(
      systemRef.current,
      gridSize.columns,
      gridSize.rows,
      simulationTimeRef.current,
    );
    if (nextSystem === systemRef.current) return;
    systemRef.current = nextSystem;
    setSystem(nextSystem);
    saveSocialStorySystem(SESSION_STORAGE_KEY, simulationTimeRef.current, nextSystem);
  }, [gridReady, gridSize]);

  useEffect(() => {
    let timer: number;
    let active = true;
    let previous = performance.now();
    let lastSaved = previous;

    const persist = () => {
      saveSocialStorySystem(SESSION_STORAGE_KEY, simulationTimeRef.current, systemRef.current);
    };
    const resetClock = () => { previous = performance.now(); };

    const scheduleStep = () => {
      timer = window.setTimeout(() => {
        if (!active) return;
        const current = performance.now();
        if (document.visibilityState !== "hidden" && !bubblesPausedRef.current) {
          simulationTimeRef.current += Math.min(
            SIMULATION_STEP_MILLISECONDS,
            Math.max(0, current - previous) * activitySpeedRef.current,
          );
          let nextSystem = stepSocialStorySystem(
            systemRef.current,
            simulationTimeRef.current,
            schoolRef.current?.drainAttention(),
            bubbleDisappearSecondsRef.current * 1000,
            activeBubbleTargetRef.current,
            bubbleAppearSecondsRef.current * 1000,
          );
          nextSystem = maintainSocialStoryActivity(
            nextSystem,
            simulationTimeRef.current,
            activeBubbleTargetRef.current,
          );
          systemRef.current = nextSystem;
          setSystem(nextSystem);
          if (current - lastSaved >= 1000) {
            persist();
            lastSaved = current;
          }
        } else if (document.visibilityState !== "hidden") {
          // Contact gathered while the story clock is paused must not create a
          // burst of deferred attention when playback resumes.
          schoolRef.current?.drainAttention();
        }
        previous = current;
        scheduleStep();
      }, SIMULATION_STEP_MILLISECONDS / activitySpeedRef.current);
    };

    document.addEventListener("visibilitychange", resetClock);
    window.addEventListener("pagehide", persist);
    scheduleStep();
    return () => {
      active = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resetClock);
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, []);

  useEffect(() => {
    const canvas = fishCanvasRef.current;
    const ringCanvas = ringCanvasRef.current;
    const traceCanvas = traceCanvasRef.current;
    if (!canvas || !ringCanvas || !traceCanvas) return;
    let disposed = false;
    let scene: GoldfishScene | undefined;
    let school: AttentionSchool | undefined;
    let timer: number | undefined;
    let previous = performance.now();
    let layoutKey = "";
    let targetSystem: typeof systemRef.current | undefined = systemRef.current;
    let elapsedSeconds = 0;
    const approaches = new ApproachEvents();
    const onApproach = (_fish: number, target: number, x: number, speed: number) => {
      soundEngine.current?.play(target, x / Math.max(1, fishLayoutRef.current.width), speed);
    };
    let tracesVisible = false;
    let renderedTraceDuration = traceDurationRef.current;
    let targetLinesVisible = false;
    let approachRingsVisible = false;
    let renderedTargetLineShape = targetLineShapeRef.current;
    let renderedFishPaletteId: FishColourPaletteId = "instagram";
    let failed = false;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fail = (reason: unknown) => {
      if (disposed || failed) return;
      failed = true;
      window.clearTimeout(timer);
      console.error("Goldfishes 0922 default renderer:", reason);
    };
    const syncTargets = () => {
      if (!school || targetSystem === systemRef.current) return false;
      school.updateTargets(systemRef.current);
      targetSystem = systemRef.current;
      return true;
    };
    const applyLayout = () => {
      const layout = fishLayoutRef.current;
      const nextKey = `${layout.width}:${layout.height}:${layout.columns}:${layout.rows}:${layout.iconSize}:${layout.gap}`;
      if (nextKey === layoutKey) return false;
      layoutKey = nextKey;
      approaches.reset();
      if (school) school.resize(layout); else school = new AttentionSchool(layout, fishCount, fishScale);
      school.setAttentionCap(attentionCapRef.current);
      schoolRef.current = school;
      targetSystem = undefined;
      syncTargets();
      return true;
    };
    const resize = () => {
      if (!scene) return;
      scene.setSize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight));
      applyLayout();
      if (school) scene.render(school.fish, elapsedSeconds, 0, showTracesRef.current, traceDurationRef.current, showTargetLinesRef.current, showApproachRingsRef.current, targetLineShapeRef.current, school.relations, fishPaletteIdRef.current);
    };
    const draw = () => {
      if (disposed || failed || !scene || !school) return;
      const started = performance.now();
      const layoutChanged = applyLayout();
      school.setAttentionCap(attentionCapRef.current);
      const targetsChanged = syncTargets();
      const traceChanged = tracesVisible !== showTracesRef.current;
      tracesVisible = showTracesRef.current;
      const traceDurationChanged = renderedTraceDuration !== traceDurationRef.current;
      renderedTraceDuration = traceDurationRef.current;
      const targetLinesChanged = targetLinesVisible !== showTargetLinesRef.current;
      targetLinesVisible = showTargetLinesRef.current;
      const approachRingsChanged = approachRingsVisible !== showApproachRingsRef.current;
      approachRingsVisible = showApproachRingsRef.current;
      const targetLineShapeChanged = renderedTargetLineShape !== targetLineShapeRef.current;
      renderedTargetLineShape = targetLineShapeRef.current;
      const fishPaletteChanged = renderedFishPaletteId !== fishPaletteIdRef.current;
      renderedFishPaletteId = fishPaletteIdRef.current;
      if (!document.hidden && !motion.matches) {
        const now = simulationTimeRef.current;
        const delta = Math.min(1000 / 24, Math.max(0, started - previous));
        elapsedSeconds += delta / 1000;
        school.step(delta / 1000, now);
        approaches.step(school.fish, school.relations, started / 1000, onApproach);
        scene.render(school.fish, elapsedSeconds, delta / 1000, showTracesRef.current, traceDurationRef.current, showTargetLinesRef.current, showApproachRingsRef.current, targetLineShapeRef.current, school.relations, fishPaletteIdRef.current);
      } else if (layoutChanged || targetsChanged || traceChanged || traceDurationChanged || targetLinesChanged || approachRingsChanged || targetLineShapeChanged || fishPaletteChanged) {
        scene.render(school.fish, elapsedSeconds, 0, showTracesRef.current, traceDurationRef.current, showTargetLinesRef.current, showApproachRingsRef.current, targetLineShapeRef.current, school.relations, fishPaletteIdRef.current);
      }
      previous = started;
      const idle = document.hidden || motion.matches;
      timer = window.setTimeout(draw, idle ? 250 : Math.max(1000 / 24, 1000 / 24 - (performance.now() - started)));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const visibility = () => {
      previous = performance.now();
      if (document.hidden || motion.matches) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(draw, 0);
    };
    const contextLost = (event: Event) => { event.preventDefault(); fail(new Error("WebGL context lost")); };
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", visibility);
    canvas.addEventListener("webglcontextlost", contextLost);
    ringCanvas.addEventListener("webglcontextlost", contextLost);
    void import("../rendering/goldfish-scene").then(({ GoldfishScene: Scene }) => {
      if (disposed) return;
      scene = new Scene(canvas, traceCanvas, ringCanvas, fishCount, fishScale);
      resize(); // Establish a static frame before autonomous animation.
      timer = window.setTimeout(draw, 1000 / 24);
    }).catch(fail);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
      ringCanvas.removeEventListener("webglcontextlost", contextLost);
      scene?.dispose();
      if (schoolRef.current === school) schoolRef.current = null;
    };
  }, [fishCount, fishScale, soundEngine]);

  const gridStyle = {
    "--grid-columns": gridSize.columns,
    "--grid-rows": gridSize.rows,
    "--story-size": `${iconSize}px`,
    "--story-gap": `${storyGap}px`,
    "--story-ring-padding": `${(iconSize / REFERENCE_STORY_SIZE) * 3.5}px`,
    "--story-separator": `${(iconSize / REFERENCE_STORY_SIZE) * 3.5}px`,
    "--story-ring-gradient": selectedRingPalette.gradient,
  } as CSSProperties;
  const bubbleCapacity = Math.max(1, gridSize.columns * gridSize.rows);
  const displayedActiveBubbleTarget = Math.min(activeBubbleTarget ?? bubbleCapacity, bubbleCapacity);
  const screenStyle = {
    "--propagation-duration": `${INFLUENCE_LIFETIME_MILLISECONDS / activitySpeed}ms`,
    "--influence-opacity": influenceOpacity,
    ...(jakarta ? { filter: `contrast(${1 + jakartaAmount * 0.0028}) brightness(${1 + jakartaAmount * 0.0004}) saturate(${1 - jakartaAmount * 0.001}) hue-rotate(${jakartaAmount * 0.06}deg)` } : {}),
  } as CSSProperties;
  const influenceGeometry = useMemo(() => system.influences.map((influence) => (
    getInfluenceGeometry(
      influence,
      stageSize,
      gridSize,
      iconSize,
      storyGap,
      system.states[influence.source]?.bubbleScale ?? 1,
      system.states[influence.target]?.bubbleScale ?? 1,
    )
  )).filter((influence): influence is InfluenceGeometry => influence !== null), [
    gridSize,
    iconSize,
    stageSize,
    storyGap,
    system.influences,
    system.states,
  ]);
  return (
    <main aria-label="Instagram stories influenced by nearby stories" className={`${styles.screen} ${bubblesPaused ? styles.bubblesPaused : ""}`}
      style={screenStyle}>
      <section className={styles.gridStage}>
        <canvas aria-hidden="true" className={styles.ringOverlay} ref={ringCanvasRef} />
        <canvas aria-hidden="true" className={styles.traceOverlay} ref={traceCanvasRef} />
        {stageSize.width > 0 && stageSize.height > 0 ? (
          <svg aria-hidden="true" className={styles.influenceLayer} viewBox={`0 0 ${stageSize.width} ${stageSize.height}`}>
            <defs>
              {influenceGeometry.map((influence) => {
                const sourcePalette = testSurface === "tech" ? techPaletteForIndex(influence.source) : selectedRingPalette;
                const targetPalette = testSurface === "tech" ? techPaletteForIndex(influence.target) : selectedRingPalette;

                return (
                  <linearGradient gradientUnits="userSpaceOnUse" id={`influence-${influence.id}`} key={influence.id} x1={influence.startX} x2={influence.endX} y1={influence.startY} y2={influence.endY}>
                    <stop offset="0%" stopColor={testSurface === "tech" ? sourcePalette.edgeMiddle : selectedRingPalette.edgeStart} stopOpacity="0.16" />
                    <stop offset="62%" stopColor={testSurface === "tech" ? targetPalette.edgeMiddle : selectedRingPalette.edgeMiddle} stopOpacity="0.76" />
                    <stop offset="100%" stopColor={testSurface === "tech" ? targetPalette.edgeMiddle : selectedRingPalette.edgeEnd} stopOpacity="1" />
                  </linearGradient>
                );
              })}
            </defs>
            {influenceGeometry.map((influence) => (
              <g className={styles.influence} key={influence.id}>
                <path className={styles.influencePath} d={influence.path} pathLength="1" stroke={`url(#influence-${influence.id})`} style={{ strokeWidth: edgeWidth }} />
                <circle className={styles.influenceTarget} cx={influence.endX} cy={influence.endY} r="2.25" />
              </g>
            ))}
          </svg>
        ) : null}
        <canvas aria-hidden="true" className={styles.fishOverlay} ref={fishCanvasRef} />
        <ul className={styles.storyGrid} ref={gridRef} style={gridStyle}>
          {system.nodes.map((story) => {
            const storyState = system.states[story.index];
            const techKeyword = techKeywords[story.index]!;
            const isEmpty = storyState?.status === "empty";
            const isNew = storyState?.status === "new";
            const isViewing = storyState?.status === "viewing";
            const isLeaving = storyState?.status === "leaving";
            const bubbleScale = storyState?.bubbleScale ?? 1;
            const lip3DIndex = lips3DTrialSourceIndices.indexOf(story.index % techPowerFaces.length);
            const showFace3D = testSurface === "face" && face3DTrialEnabled && faceType === "bigTechOriginal";
            const showLips3D = testSurface === "lips" && lips3DTrialEnabled && lipSource === "tech" && lipVersion === "v2" && lipColour === "original" && lip3DIndex >= 0;
            const storyStyle = {
              "--bubble-scale": bubbleScale,
              "--bubble-appear-duration": `${bubbleAppearSeconds / activitySpeed}s`,
              "--bubble-disappear-duration": `${bubbleDisappearSeconds * bubbleScale / activitySpeed}s`,
              "--bubble-viewing-duration": `${760 * bubbleScale / activitySpeed}ms`,
            } as CSSProperties;

            return (
              <li className={styles.gridItem} key={story.id}>
                <span className={`${styles.story} ${isEmpty ? styles.storyEmpty : isLeaving ? styles.storyLeaving : isNew ? styles.storyEntering : ""}`} style={storyStyle}>
                  <span className={`${styles.storyRing} ${isNew ? styles.storyRingNew : isViewing ? styles.storyRingViewing : isLeaving ? styles.storyRingLeaving : isEmpty ? styles.storyRingDormant : styles.storyRingPlain} ${testSurface === "eyes" && eyeType !== "human" && eye3DEnabled ? styles.storyRingEye3D : ""} ${showFace3D ? styles.storyRingFace3D : ""}`} style={testSurface === "tech" && ringPaletteId !== "transparent" ? { "--story-ring-gradient": techPaletteForIndex(story.index).gradient } as CSSProperties : undefined}>
                    <span
                      aria-hidden="true"
                      className={`${styles.logoSurface} ${testSurface === "apps" || testSurface === "icons" || testSurface === "hieroglyphs" || testSurface === "techMono" || testSurface === "tech" ? styles.centeredSurface : ""}`}
                      style={showFace3D || showLips3D ? { backgroundColor: "#171a1e" } : surfaceStyles[story.index]}
                    >
                      {testSurface === "eyes" && eyeType !== "human" && eye3DEnabled ? (
                        <TechEye3D index={story.index} blinking={eye3DBlinking} gradient={eyeType === "bigTechColour" ? brandGradient(story.index) : undefined} active={!isEmpty && !isLeaving && !bubblesPaused} />
                      ) : null}
                      {testSurface === "eyes" && eyeType !== "human" && !eye3DEnabled && eyeBlinkEnabled ? (
                        <TechEyeBlink index={story.index} gradient={eyeType === "bigTechColour" ? brandGradient(story.index) : undefined} active={!isEmpty && !isLeaving} paused={bubblesPaused} controller={eyeBlinkController} />
                      ) : null}
                      {showFace3D ? (
                        <TechFace3D index={story.index % techFace3DStudies.length} active={!isEmpty && !isLeaving && !bubblesPaused} />
                      ) : null}
                      {showLips3D ? (
                        <TechLips3D index={lip3DIndex} active={!isEmpty && !isLeaving && !bubblesPaused} />
                      ) : null}
                      {showOriginMarks ? <span aria-hidden="true" className={styles.originMarker}>+</span> : null}
                      {testSurface === "apps" ? apps3DEnabled ? <AppSphere3D index={story.index} active={apps3DRotating && !isEmpty && !isLeaving && !bubblesPaused} /> : <AppServiceMark index={story.index} /> : null}
                      {testSurface === "icons" ? icons3DEnabled
                        ? <SnsIcon3D index={story.index} colour={icons3DColour} active={!isEmpty && !isLeaving && !bubblesPaused} />
                        : <SnsActionIcon index={story.index} /> : null}
                      {testSurface === "hieroglyphs" ? hieroglyphSet === "tech" ? <TechHieroglyph term={techKeyword.abbreviation} /> : <HieroglyphMark glyph={egyptianHieroglyphs[story.index % egyptianHieroglyphs.length]!} /> : null}
                      {testSurface === "techMono" || testSurface === "tech" ? techTypeface === "image" || techTypeface === "imageMono" ? null : <TechMark term={techKeyword.abbreviation} typeface={techTypeface} /> : null}
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-label="Field controls" className={styles.controls}>
        <button aria-controls="story-surface-controls" aria-expanded={isControlsExpanded} className={styles.controlsToggle} onClick={() => setIsControlsExpanded((current) => !current)} type="button">
          {isControlsExpanded ? "close" : "controls"}
        </button>
        {isControlsExpanded ? (
          <div className={styles.controlPanel} id="story-surface-controls">
            <div className={styles.controlScroll}>
              <fieldset className={styles.controlGroup}>
                <legend className={styles.controlLegend}>parameters</legend>
                <div aria-label="Overlay parameter combinations" className={styles.optionGrid} role="group">
                  <button aria-label="Use overlay 4 parameter combination" aria-pressed={activeParameterPreset === "4"} className={styles.optionButton} onClick={() => applyParameterPreset("4")} type="button">4</button>
                  <button aria-label="Use overlay 5 parameter combination" aria-pressed={activeParameterPreset === "5"} className={styles.optionButton} onClick={() => applyParameterPreset("5")} type="button">5</button>
                </div>
              </fieldset>

              <fieldset className={styles.controlGroup}>
                <legend className={styles.controlLegend}>surface</legend>
                <div className={styles.optionGrid}>
                  {surfaceOptions.map((option) => (
                    <button aria-pressed={testSurface === option.value} className={styles.optionButton} key={option.value} onClick={() => setTestSurface(option.value)} type="button">
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {testSurface === "icons" ? (
                <fieldset className={styles.controlGroup}>
                  <legend className={styles.controlLegend}>icons</legend>
                  <div aria-label="Icon dimension" className={styles.optionGrid} role="group">
                    <button aria-pressed={!icons3DEnabled} className={styles.optionButton} onClick={() => setIcons3DEnabled(false)} type="button">2D</button>
                    <button aria-pressed={icons3DEnabled} className={styles.optionButton} onClick={() => setIcons3DEnabled(true)} type="button">3D</button>
                  </div>
                  {icons3DEnabled ? (
                    <>
                      <div aria-label="Icon colour" className={styles.optionGrid} role="group" style={{ marginTop: "0.5rem" }}>
                        <button aria-pressed={icons3DColour === "monochrome"} className={styles.optionButton} onClick={() => setIcons3DColour("monochrome")} type="button">monochrome</button>
                        <button aria-pressed={icons3DColour === "colour"} className={styles.optionButton} onClick={() => setIcons3DColour("colour")} type="button">colour</button>
                      </div>
                      <details style={{ marginTop: "0.65rem" }}>
                        <summary style={{ cursor: "pointer" }}>inspect 3D icons · drag to rotate</summary>
                        <div style={{ width: "100%", aspectRatio: "1", maxWidth: "256px", margin: "0.5rem auto", position: "relative" }}>
                          <SnsIcon3D index={icons3DStudyIndex} colour={icons3DColour} active={false} inspect />
                        </div>
                        <div className={styles.optionGrid}>
                          {snsActions.map((action, index) => (
                            <button aria-pressed={icons3DStudyIndex === index} className={styles.optionButton} key={action.id} onClick={() => setIcons3DStudyIndex(index)} type="button">{action.label}</button>
                          ))}
                        </div>
                      </details>
                    </>
                  ) : null}
                </fieldset>
              ) : null}

              {testSurface === "face" ? (
                <fieldset className={styles.controlGroup}>
                  <legend className={styles.controlLegend}>face type</legend>
                  <div className={styles.optionGrid}>
                    {faceTypeOptions.map((option) => (
                      <button aria-pressed={faceType === option.value} className={styles.optionButton} key={option.value} onClick={() => { setFaceType(option.value); if (option.value !== "bigTechOriginal") setFace3DTrialEnabled(false); }} type="button">
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div aria-label="Face dimension" className={styles.optionGrid} role="group" style={{ marginTop: "0.5rem" }}>
                    <button aria-pressed={!face3DTrialEnabled} className={styles.optionButton} onClick={() => setFace3DTrialEnabled(false)} type="button">photo 2D</button>
                    <button aria-pressed={face3DTrialEnabled} className={styles.optionButton} onClick={() => { setFaceType("bigTechOriginal"); setFace3DTrialEnabled(true); }} type="button">face 3D · all</button>
                  </div>
                  {face3DTrialEnabled && faceType === "bigTechOriginal" ? (
                    <details style={{ marginTop: "0.65rem" }}>
                      <summary style={{ cursor: "pointer" }}>inspect 3D faces · drag to rotate</summary>
                      <FaceStudyInspector index={face3DStudyIndex} onChange={setFace3DStudyIndex} />
                    </details>
                  ) : null}
                </fieldset>
              ) : null}

              {testSurface === "apps" ? (
                <fieldset className={styles.controlGroup}>
                  <legend className={styles.controlLegend}>app dimension</legend>
                  <div className={styles.optionGrid}>
                    <button aria-pressed={!apps3DEnabled} className={styles.optionButton} onClick={() => setApps3DEnabled(false)} type="button">2D</button>
                    <button aria-pressed={apps3DEnabled} className={styles.optionButton} onClick={() => setApps3DEnabled(true)} type="button">spherical 3D</button>
                  </div>
                  {apps3DEnabled ? <>
                    <div aria-label="App sphere rotation" className={styles.optionGrid} role="group" style={{ marginTop: "0.5rem" }}>
                      <button aria-pressed={apps3DRotating} className={styles.optionButton} onClick={() => setApps3DRotating(true)} type="button">rotate</button>
                      <button aria-pressed={!apps3DRotating} className={styles.optionButton} onClick={() => setApps3DRotating(false)} type="button">still</button>
                    </div>
                    <details style={{ marginTop: "0.65rem" }}>
                      <summary style={{ cursor: "pointer" }}>inspect 3D apps · drag to rotate</summary>
                      <AppStudyInspector index={apps3DStudyIndex} onChange={setApps3DStudyIndex} rotating={apps3DRotating} />
                    </details>
                  </> : null}
                </fieldset>
              ) : null}

              {testSurface === "eyes" ? (
                <fieldset className={styles.controlGroup}>
                  <legend className={styles.controlLegend}>eye type</legend>
                  <div className={styles.optionGrid}>
                    {eyeTypeOptions.map((option) => (
                      <button aria-pressed={eyeType === option.value} className={styles.optionButton} key={option.value} onClick={() => setEyeType(option.value)} type="button">
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {eyeType !== "human" ? (
                    <div aria-label="Tech eye motion" className={styles.optionGrid} role="group">
                      <button aria-pressed={!eye3DEnabled && !eyeBlinkEnabled} className={styles.optionButton} onClick={() => { setEye3DEnabled(false); setEyeBlinkEnabled(false); }} type="button">static 2D</button>
                      <button aria-pressed={!eye3DEnabled && eyeBlinkEnabled} className={styles.optionButton} onClick={() => { setEye3DEnabled(false); setEyeBlinkEnabled(true); }} type="button">blinking 2D</button>
                      <button aria-pressed={eye3DEnabled && !eye3DBlinking} className={styles.optionButton} onClick={() => { setEye3DEnabled(true); setEye3DBlinking(false); }} type="button">3D eyeball</button>
                      <button aria-pressed={eye3DEnabled && eye3DBlinking} className={styles.optionButton} onClick={() => { setEye3DEnabled(true); setEye3DBlinking(true); }} type="button">3D blinking</button>
                      <button disabled={!eye3DEnabled && !eyeBlinkEnabled} className={styles.optionButton} onClick={() => eye3DEnabled ? blinkAll3DEyes() : eyeBlinkController.blinkAll()} title="Blink all loaded eyes once, including while paused" type="button">blink all</button>
                    </div>
                  ) : null}
                  {eyeType !== "human" && eye3DEnabled ? (
                    <label className={styles.sliderControl}>
                      <span>blink speed</span>
                      <input aria-label="3D blink speed" max="1.4" min="0.4" onChange={(event) => {
                        const speed = Number(event.currentTarget.value);
                        setEye3DBlinkSpeed(speed);
                        set3DEyeBlinkSpeed(speed);
                      }} step="0.05" type="range" value={eye3DBlinkSpeed} />
                      <output>×{eye3DBlinkSpeed.toFixed(2)}</output>
                    </label>
                  ) : null}
                  {eyeType !== "human" && eye3DEnabled ? (
                    <details style={{ marginTop: "0.65rem" }}>
                      <summary style={{ cursor: "pointer" }}>inspect 3D · drag to rotate</summary>
                      <EyeStudyInspector index={eye3DStudyIndex} onChange={setEye3DStudyIndex} blinking={eye3DBlinking} paused={bubblesPaused} />
                    </details>
                  ) : null}
                </fieldset>
              ) : null}

              {testSurface === "lips" ? (
                <>
                  <fieldset className={styles.controlGroup}>
                    <legend className={styles.controlLegend}>lip source</legend>
                    <div className={styles.optionGrid}>
                      {lipSourceOptions.map((option) => (
                        <button aria-pressed={lipSource === option.value} className={styles.optionButton} key={option.value} onClick={() => { setLipSource(option.value); if (option.value !== "tech") setLips3DTrialEnabled(false); }} type="button">
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className={styles.controlGroup}>
                    <legend className={styles.controlLegend}>lip version</legend>
                    <div className={styles.optionGrid}>
                      {lipVersionOptions.map((option) => (
                        <button aria-pressed={lipVersion === option.value} className={styles.optionButton} key={option.value} onClick={() => { setLipVersion(option.value); if (option.value !== "v2") setLips3DTrialEnabled(false); }} type="button">
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className={styles.controlGroup}>
                    <legend className={styles.controlLegend}>lip colour</legend>
                    <div className={styles.optionGrid}>
                      {lipColourOptions.map((option) => (
                        <button aria-pressed={lipColour === option.value} className={styles.optionButton} key={option.value} onClick={() => { setLipColour(option.value); if (option.value !== "original") setLips3DTrialEnabled(false); }} type="button">
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <div aria-label="Lip dimension" className={styles.optionGrid} role="group" style={{ marginTop: "0.5rem" }}>
                      <button aria-pressed={!lips3DTrialEnabled} className={styles.optionButton} onClick={() => setLips3DTrialEnabled(false)} type="button">photo 2D</button>
                      <button aria-pressed={lips3DTrialEnabled} className={styles.optionButton} onClick={() => { setLipSource("tech"); setLipVersion("v2"); setLipColour("original"); setLips3DTrialEnabled(true); }} type="button">lips 3D · all</button>
                    </div>
                    {lips3DTrialEnabled && lipSource === "tech" && lipVersion === "v2" && lipColour === "original" ? (
                      <details style={{ marginTop: "0.65rem" }}>
                        <summary style={{ cursor: "pointer" }}>inspect 3D lips · drag to rotate</summary>
                        <LipsStudyInspector index={lips3DStudyIndex} onChange={setLips3DStudyIndex} />
                      </details>
                    ) : null}
                  </fieldset>
                </>
              ) : null}

              {testSurface === "hieroglyphs" ? (
                <fieldset className={styles.controlGroup}>
                  <legend className={styles.controlLegend}>hieroglyphs</legend>
                  <div className={styles.optionGrid}>
                    {(["default", "tech"] as const).map((set) => (
                      <button aria-pressed={hieroglyphSet === set} className={styles.optionButton} key={set} onClick={() => setHieroglyphSet(set)} type="button">{set}</button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {testSurface === "techMono" || testSurface === "tech" ? (
                <fieldset className={styles.controlGroup}>
                  <legend className={styles.controlLegend}>tech type</legend>
                  <div className={styles.optionGrid}>
                    {techTypefaceOptions.map((option) => (
                      <button aria-pressed={techTypeface === option.value} className={styles.optionButton} key={option.value} onClick={() => setTechTypeface(option.value)} type="button">
                        {option.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              <fieldset className={styles.controlGroup}>
                <legend className={styles.controlLegend}>layout</legend>
                <label className={styles.sliderControl}>
                  <span>icon</span>
                  <input aria-label="Story icon size" max={MAX_ICON_SIZE} min={MIN_ICON_SIZE} onChange={(event) => updateIconSize(Number(event.currentTarget.value))} step="1" type="range" value={iconSize} />
                  <output>{iconSize}px</output>
                </label>
                <label className={styles.sliderControl}>
                  <span>margin</span>
                  <input aria-label="Space between story icons" max={MAX_STORY_GAP} min="0" onChange={(event) => updateStoryGap(Number(event.currentTarget.value))} step="1" type="range" value={storyGap} />
                  <output>{storyGap}px</output>
                </label>
              </fieldset>

              <fieldset className={styles.controlGroup}>
                <legend className={styles.controlLegend}>bubble animation</legend>
                <label className={styles.sliderControl}>
                  <span>appear</span>
                  <input aria-label="Bubble appearing duration" max={MAX_BUBBLE_APPEAR_SECONDS} min={MIN_BUBBLE_ANIMATION_SECONDS} onChange={(event) => { const next = Number(event.currentTarget.value); bubbleAppearSecondsRef.current = next; setBubbleAppearSeconds(next); }} step="0.05" type="range" value={bubbleAppearSeconds} />
                  <output>{bubbleAppearSeconds.toFixed(2)}s</output>
                </label>
                <label className={styles.sliderControl}>
                  <span>disappear</span>
                  <input aria-label="Bubble disappearing duration" max={MAX_BUBBLE_DISAPPEAR_SECONDS} min={MIN_BUBBLE_ANIMATION_SECONDS} onChange={(event) => { const next = Number(event.currentTarget.value); bubbleDisappearSecondsRef.current = next; setBubbleDisappearSeconds(next); }} step="0.05" type="range" value={bubbleDisappearSeconds} />
                  <output>{bubbleDisappearSeconds.toFixed(2)}s</output>
                </label>
              </fieldset>

              <fieldset className={styles.controlGroup}>
                <legend className={styles.controlLegend}>bubble system</legend>
                <div className={styles.optionGrid}>
                  <button aria-pressed={bubblesPaused} className={styles.optionButton} onClick={() => setBubblesPaused((current) => {
                    const next = !current;
                    bubblesPausedRef.current = next;
                    return next;
                  })} type="button">{bubblesPaused ? "play" : "pause"}</button>
                  <button aria-pressed={activeBubbleTarget === null} className={styles.optionButton} onClick={() => {
                    activeBubbleTargetRef.current = null;
                    setActiveBubbleTarget(null);
                  }} type="button">natural level</button>
                </div>
                <label className={styles.sliderControl}>
                  <span>active</span>
                  <input aria-label="Target level of simultaneously active bubbles" max={bubbleCapacity} min="1" onChange={(event) => {
                    const next = Number(event.currentTarget.value);
                    activeBubbleTargetRef.current = next;
                    setActiveBubbleTarget(next);
                  }} step="1" type="range" value={displayedActiveBubbleTarget} />
                  <output>{activeBubbleTarget === null ? "natural" : `~${displayedActiveBubbleTarget}`}</output>
                </label>
                <label className={styles.sliderControl}>
                  <span>speed</span>
                  <input aria-label="Overall bubble activity speed" max={MAX_ACTIVITY_SPEED} min={MIN_ACTIVITY_SPEED} onChange={(event) => {
                    updateActivitySpeed(Number(event.currentTarget.value));
                  }} step="0.1" type="range" value={activitySpeed} />
                  <output>×{activitySpeed.toFixed(2)}</output>
                </label>
                <label className={styles.sliderControl}>
                  <span>line</span>
                  <input aria-label="Propagation line opacity" max="1" min="0" onChange={(event) => setInfluenceOpacity(Number(event.currentTarget.value))} step="0.05" type="range" value={influenceOpacity} />
                  <output>{influenceOpacity.toFixed(2)}</output>
                </label>
              </fieldset>

              <fieldset className={styles.controlGroup}>
                <legend className={styles.controlLegend}>fish school</legend>
                <label className={styles.sliderControl}>
                  <span>size</span>
                  <input aria-label="Goldfish size" max={MAX_FISH_SCALE} min={MIN_FISH_SCALE} onChange={(event) => updateFishScale(Number(event.currentTarget.value))} step="0.05" type="range" value={fishScale} />
                  <output>×{fishScale.toFixed(2)}</output>
                </label>
                <label className={styles.sliderControl}>
                  <span>count</span>
                  <input aria-label="Goldfish count" max={MAX_FISH_COUNT} min={MIN_FISH_COUNT} onChange={(event) => setFishCount(Number(event.currentTarget.value))} step="10" type="range" value={fishCount} />
                  <output>{fishCount}</output>
                </label>
                <div className={styles.optionGrid}>
                  <button aria-pressed={attentionCapEnabled} className={styles.optionButton} onClick={() => setAttentionCapEnabled((current) => {
                    const next = !current;
                    attentionCapRef.current = next ? attentionCap : null;
                    return next;
                  })} type="button">attention cap {attentionCapEnabled ? "on" : "off"}</button>
                </div>
                <label aria-disabled={!attentionCapEnabled} className={styles.sliderControl}>
                  <span>per bubble</span>
                  <input aria-label="Maximum goldfish attention per bubble" disabled={!attentionCapEnabled} max={MAX_FISH_COUNT} min="1" onChange={(event) => {
                    const next = Number(event.currentTarget.value);
                    attentionCapRef.current = next;
                    setAttentionCap(next);
                  }} step="1" type="range" value={attentionCap} />
                  <output>{attentionCapEnabled ? attentionCap : "off"}</output>
                </label>
                <div className={styles.paletteRow}>
                  <span className={styles.choiceLabel}>colour</span>
                  <span aria-label="Goldfish colour palette" className={styles.paletteOptions} role="group">
                    {fishColourPalettes.map((palette) => (
                      <button aria-label={palette.name} aria-pressed={palette.id === fishPaletteId} className={styles.paletteOption} key={palette.id} onClick={() => { fishPaletteIdRef.current = palette.id; setFishPaletteId(palette.id); }} type="button">
                        <span aria-hidden="true" className={styles.palettePreview} style={{ background: palette.gradient }} />
                      </button>
                    ))}
                  </span>
                </div>
              </fieldset>

              {testSurface === "eyes" && eyeType !== "human" && eye3DEnabled ? null : <fieldset className={styles.controlGroup}>
                <legend className={styles.controlLegend}>story rings</legend>
                <div className={styles.paletteRow}>
                  <span className={styles.choiceLabel}>colour</span>
                  <span aria-label="Story ring colour palette" className={styles.paletteOptions} role="group">
                    {storyRingPalettes.map((palette) => (
                      <button aria-label={palette.name} aria-pressed={palette.id === ringPaletteId} className={styles.paletteOption} key={palette.id} onClick={() => setRingPaletteId(palette.id)} type="button">
                        <span aria-hidden="true" className={styles.palettePreview} style={{ background: palette.previewGradient ?? palette.gradient }} />
                      </button>
                    ))}
                  </span>
                </div>
              </fieldset>}

              <fieldset className={styles.controlGroup}>
                <legend className={styles.controlLegend}>sound</legend>
                <button aria-pressed={sound.enabled} disabled={sound.busy} className={styles.optionButton} onClick={() => void sound.toggle()} type="button">sound {sound.enabled ? "on" : "off"}</button>
                <label className={styles.sliderControl}>
                  <span>volume</span>
                  <input aria-label="Approach sound volume" type="range" min="0" max="70" step="1" value={sound.volume} onChange={event => sound.changeVolume(Number(event.currentTarget.value))} />
                  <output>{sound.volume}%</output>
                </label>
                {sound.error ? <p role="status">{sound.error}</p> : null}
              </fieldset>
              <fieldset className={styles.controlGroup}>
                <legend className={styles.controlLegend}>field</legend>
                <div className={styles.optionGrid}>
                  <button aria-pressed={jakarta} className={styles.optionButton} onClick={() => setJakarta((current) => !current)} type="button">backboard</button>
                  <button aria-pressed={showTraces} className={styles.optionButton} onClick={() => setShowTraces((current) => { const next = !current; showTracesRef.current = next; return next; })} type="button">traces</button>
                  <button aria-pressed={showTargetLines} className={styles.optionButton} onClick={() => setShowTargetLines((current) => { const next = !current; showTargetLinesRef.current = next; return next; })} type="button">target lines</button>
                  <button aria-pressed={showApproachRings} className={styles.optionButton} onClick={() => updateApproachRings(!showApproachRings)} type="button">approach rings</button>
                  <button aria-pressed={targetLineShape === "curve"} className={styles.optionButton} onClick={() => {
                    const next = targetLineShapeRef.current === "straight" ? "curve" : "straight";
                    targetLineShapeRef.current = next;
                    setTargetLineShape(next);
                    if (next === "curve" && !showTargetLinesRef.current) {
                      showTargetLinesRef.current = true;
                      setShowTargetLines(true);
                    }
                  }} type="button">target curve</button>
                  <button aria-pressed={showOriginMarks} className={styles.optionButton} onClick={() => setShowOriginMarks((current) => !current)} type="button">origins +</button>
                </div>
                <label aria-disabled={!jakarta} className={styles.sliderControl}>
                  <span>filter</span>
                  <input aria-label="Backboard intensity" disabled={!jakarta} max="100" min="0" onChange={(event) => setJakartaAmount(Number(event.currentTarget.value))} step="1" type="range" value={jakartaAmount} />
                  <output>{jakartaAmount}%</output>
                </label>
                <label aria-disabled={!showTraces} className={styles.sliderControl}>
                  <span>trace</span>
                  <input aria-label="Recent goldfish trace duration" disabled={!showTraces} max="10" min="1" onChange={(event) => { const next = Number(event.currentTarget.value); traceDurationRef.current = next; setTraceDurationSeconds(next); }} step="1" type="range" value={traceDurationSeconds} />
                  <output>{traceDurationSeconds}s</output>
                </label>
              </fieldset>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function AppStudyInspector({ index, onChange, rotating }: { index: number; onChange: (index: number) => void; rotating: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const details = host.current?.closest("details");
    if (!details) return;
    const update = () => setVisible(details.open);
    details.addEventListener("toggle", update);
    update();
    return () => details.removeEventListener("toggle", update);
  }, []);
  return <div ref={host}>
    <div style={{ position: "relative", width: "100%", aspectRatio: "1", maxWidth: 240, margin: "0.5rem auto" }}>
      {visible ? <AppSphere3D key={index} index={index} active={rotating} inspect /> : null}
    </div>
    <div className={styles.optionGrid}>
      <button className={styles.optionButton} onClick={() => onChange((index + appServiceCount - 1) % appServiceCount)} type="button">previous</button>
      <button className={styles.optionButton} onClick={() => onChange((index + 1) % appServiceCount)} type="button">next</button>
    </div>
    <select aria-label="3D app identity" className={styles.optionButton} value={index} onChange={(event) => onChange(Number(event.target.value))} style={{ width: "100%", marginTop: "0.3rem" }}>
      {Array.from({ length: appServiceCount }, (_, itemIndex) => <option key={itemIndex} value={itemIndex}>{appServiceAt(itemIndex).name}</option>)}
    </select>
  </div>;
}

function EyeStudyInspector({ index, onChange, blinking, paused }: { index: number; onChange: (index: number) => void; blinking: boolean; paused: boolean }) {
  // Mount only while the native disclosure is open, so it consumes no GPU when closed.
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const study = techEye3DStudies[index]!;
  const { size, crop } = study.profile;
  useEffect(() => {
    const details = host.current?.closest("details");
    if (!details) return;
    const update = () => setVisible(details.open);
    details.addEventListener("toggle", update);
    update();
    return () => details.removeEventListener("toggle", update);
  }, []);
  return <div ref={host}>
    <div style={{ position: "relative", width: "100%", aspectRatio: "1", maxWidth: 240, margin: "0.5rem auto" }}>
      {visible && !showSource ? <TechEye3D key={study.id} index={index} active={blinking && !paused} blinking={blinking} inspect /> : null}
      {showSource ? <div role="img" aria-label={`${study.name}: original photographic eye crop`} style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        backgroundImage: `url(${study.sourceImage})`,
        backgroundSize: `${size[0] / crop[2] * 100}% ${size[1] / crop[2] * 100}%`,
        backgroundPosition: `${crop[0] / (size[0] - crop[2]) * 100}% ${crop[1] / (size[1] - crop[2]) * 100}%`,
      }} /> : null}
    </div>
    <div className={styles.optionGrid} style={{ marginBottom: "0.5rem" }}>
      <button type="button" className={styles.optionButton} aria-pressed={!showSource} onClick={() => setShowSource(false)}>3D</button>
      <button type="button" className={styles.optionButton} aria-pressed={showSource} onClick={() => setShowSource(true)}>original photo</button>
    </div>
    <div className={styles.optionGrid}>
      <button type="button" className={styles.optionButton} onClick={() => onChange((index + techEye3DStudies.length - 1) % techEye3DStudies.length)}>previous</button>
      <button type="button" className={styles.optionButton} onClick={() => onChange((index + 1) % techEye3DStudies.length)}>next</button>
    </div>
    <select aria-label="3D eye identity" className={styles.optionButton} value={index} onChange={(event) => onChange(Number(event.target.value))} style={{ width: "100%", marginTop: "0.3rem" }}>
      {techEye3DStudies.map((item) => <option key={item.id} value={item.index}>{item.name}</option>)}
    </select>
  </div>;
}

function FaceStudyInspector({ index, onChange }: { index: number; onChange: (index: number) => void }) {
  const study = techFace3DStudies[index]!;
  return <TrialStudyInspector
    index={index} count={techFace3DStudies.length} name={study.name} sourceImage={study.sourceImage}
    label="3D face identity" onChange={onChange}
    options={techFace3DStudies.map((item) => ({ id: item.id, name: item.name }))}
    model={<TechFace3D key={study.id} index={index} inspect active={false} />}
  />;
}

function LipsStudyInspector({ index, onChange }: { index: number; onChange: (index: number) => void }) {
  const study = lips3DStudies[index]!;
  return <TrialStudyInspector
    index={index} count={lips3DStudies.length} name={study.name} sourceImage={study.v2ComparisonImage}
    label="3D lip identity" onChange={onChange}
    options={lips3DStudies.map((item) => ({ id: item.id, name: item.name }))}
    fallbackReason={!study.usable ? "V2 photo retained · no verified 3D source" : undefined}
    model={<TechLips3D key={study.id} index={index} inspect active={false} />}
  />;
}

function TrialStudyInspector({ index, count, name, sourceImage, label, onChange, options, model, fallbackReason }: {
  index: number; count: number; name: string; sourceImage: string; label: string;
  onChange: (index: number) => void; options: readonly { id: string; name: string }[]; model: ReactNode; fallbackReason?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [showSource, setShowSource] = useState(false);
  useEffect(() => {
    const details = host.current?.closest("details");
    if (!details) return;
    const update = () => setVisible(details.open);
    details.addEventListener("toggle", update);
    update();
    return () => details.removeEventListener("toggle", update);
  }, []);
  return <div ref={host}>
    <div style={{ position: "relative", width: "100%", aspectRatio: "1", maxWidth: 240, margin: "0.5rem auto" }}>
      {visible && !showSource && !fallbackReason ? model : null}
      {(showSource || fallbackReason) ? <div role="img" aria-label={`${name}: exact original photographic source`} style={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundImage: `url(${sourceImage})`, backgroundPosition: "center", backgroundSize: "cover" }} /> : null}
    </div>
    {fallbackReason ? <p style={{ margin: "0 0 0.5rem", opacity: 0.72, fontSize: "0.7rem" }}>{fallbackReason}</p> : <div className={styles.optionGrid} style={{ marginBottom: "0.5rem" }}>
      <button type="button" className={styles.optionButton} aria-pressed={!showSource} onClick={() => setShowSource(false)}>3D</button>
      <button type="button" className={styles.optionButton} aria-pressed={showSource} onClick={() => setShowSource(true)}>original photo</button>
    </div>}
    <div className={styles.optionGrid}>
      <button type="button" className={styles.optionButton} onClick={() => onChange((index + count - 1) % count)}>previous</button>
      <button type="button" className={styles.optionButton} onClick={() => onChange((index + 1) % count)}>next</button>
    </div>
    <select aria-label={label} className={styles.optionButton} value={index} onChange={(event) => onChange(Number(event.target.value))} style={{ width: "100%", marginTop: "0.3rem" }}>
      {options.map((item, optionIndex) => <option key={item.id} value={optionIndex}>{item.name}</option>)}
    </select>
  </div>;
}
