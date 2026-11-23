import { techEye3DStudies } from "./tech-eye-3d";
import { face3DProfiles } from "./face-3d-profiles.generated";

export type TechFace3DStudy = {
  id: string;
  name: string;
  affiliation: string;
  sourceImage: string;
  // Normalized portrait window. The initial five retain the hand-composed
  // studies; later windows use detected face boxes in the same local portrait.
  faceWindow: readonly [number, number, number, number];
  ovoid: readonly [number, number, number];
  restingTurn: readonly [number, number];
  wobble: readonly [number, number];
  finish: readonly [number, number];
};

const originalFive: readonly TechFace3DStudy[] = [
  { id: "001", name: "Sam Altman", affiliation: "OpenAI", sourceImage: "/images/0922/tech-eye-3d/portraits/001.jpg", faceWindow: [0.14, 0.055, 0.62, 0.54], ovoid: [0.91, 1.08, 0.74], restingTurn: [-0.03, -0.06], wobble: [0.022, 0.72], finish: [0.43, 0.32] },
  { id: "002", name: "Mark Zuckerberg", affiliation: "Meta", sourceImage: "/images/0922/tech-eye-3d/portraits/002.jpg", faceWindow: [0.1, 0.045, 0.64, 0.57], ovoid: [0.96, 1.04, 0.71], restingTurn: [0.02, 0.055], wobble: [0.019, 0.82], finish: [0.45, 0.28] },
  { id: "003", name: "Jensen Huang", affiliation: "Nvidia", sourceImage: "/images/0922/tech-eye-3d/portraits/003.jpg", faceWindow: [0.16, 0.075, 0.62, 0.61], ovoid: [0.93, 1.11, 0.76], restingTurn: [-0.02, -0.05], wobble: [0.024, 0.68], finish: [0.4, 0.35] },
  { id: "004", name: "Sundar Pichai", affiliation: "Alphabet", sourceImage: "/images/0922/tech-eye-3d/portraits/004.jpg", faceWindow: [0.18, 0.055, 0.62, 0.55], ovoid: [0.9, 1.1, 0.73], restingTurn: [0.025, 0.065], wobble: [0.018, 0.78], finish: [0.46, 0.27] },
  { id: "005", name: "Dario Amodei", affiliation: "Anthropic", sourceImage: "/images/0922/tech-eye-3d/portraits/005.jpg", faceWindow: [0.18, 0.025, 0.64, 0.61], ovoid: [0.94, 1.07, 0.7], restingTurn: [-0.015, -0.055], wobble: [0.021, 0.74], finish: [0.42, 0.31] },
];

function unit(index: number, salt: number) {
  const value = Math.sin((index + 1) * (12.9898 + salt * 19.73)) * 43758.5453123;
  return value - Math.floor(value);
}

function laterFaceStudy(index: number): TechFace3DStudy {
  const portrait = techEye3DStudies[index]!;
  const profile = face3DProfiles[portrait.id]!;
  const [faceLeft, faceTop, faceWidth, faceHeight] = profile.face ?? [0, 0, 1, 1];
  // Expand a detected face enough for hair and chin. Four small sources stay
  // lower-resolution, but they still receive the same single 3D surface.
  const cropWidth = Math.min(1, Math.max(faceWidth * 1.32, faceHeight * 1.04));
  const cropHeight = Math.min(1, Math.max(faceHeight * 1.62, cropWidth / 0.8));
  const left = Math.min(1 - cropWidth, Math.max(0, faceLeft + faceWidth / 2 - cropWidth / 2));
  const top = Math.min(1 - cropHeight, Math.max(0, faceTop + faceHeight * 0.5 - cropHeight * 0.5));
  return {
    id: portrait.id, name: portrait.name, affiliation: portrait.affiliation, sourceImage: portrait.sourceImage,
    faceWindow: [left, top, cropWidth, cropHeight],
    ovoid: [0.84 + unit(index, 5) * 0.16, 1.03 + unit(index, 6) * 0.16, 0.68 + unit(index, 7) * 0.1],
    restingTurn: [(unit(index, 8) - 0.5) * 0.07, (unit(index, 9) - 0.5) * 0.16],
    wobble: [0.018 + unit(index, 10) * 0.012, 0.65 + unit(index, 11) * 0.2],
    finish: [0.39 + unit(index, 12) * 0.1, 0.24 + unit(index, 13) * 0.12],
  };
}

// 80 local, source-matched portrait studies. No generative faces are used.
export const techFace3DStudies: readonly TechFace3DStudy[] = techEye3DStudies.map((_, index) => originalFive[index] ?? laterFaceStudy(index));

export function techFace3DStudy(index: number) {
  return Number.isInteger(index) ? techFace3DStudies[index] : undefined;
}
