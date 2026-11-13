import profiles from "./lips-3d-profiles.generated.json";
import { techPowerFaces } from "./tech-power-faces.generated";
import upgradeBatch from "../source/lips-3d-upgrade-batch.json";

export type Lips3DSourceFraming = "well-framed" | "v2-clipped" | "unresolved";
export type Lips3DSourceQuality = "usable" | "limited" | "too-small" | "unusable" | "baseline-preserved" | "source-upgrade";
export type Lips3DForm = { width: number; upperFullness: number; lowerFullness: number; cupidDip: number; smileLift: number; aperture: number; teeth: number };
export type Lips3DStudy = { readonly storyIndex: number; readonly id: string; readonly name: string; readonly affiliation: string; readonly sourceImage: string; readonly v2ComparisonImage: string; readonly usable: boolean; readonly sourceQuality: Lips3DSourceQuality; readonly qualityReason?: string; readonly framing: Lips3DSourceFraming; readonly form: Lips3DForm };
type Observation = { width: number; height: number; faceWidth: number; endpointLift: number; centerDip: number };
type CropProfile = { id: string; usable: boolean; quality: Lips3DSourceQuality; reason: string | null; mouth: Observation | null };
type UpgradeEntry = { id: string; crop: string; outerLipsPx: string; cropPx: string };
const byId = new Map((profiles as CropProfile[]).map((profile) => [profile.id, profile]));
const sourceUpgrades = new Map((upgradeBatch.entries as UpgradeEntry[]).map((entry) => [entry.id, entry]));
const baselineForms: Readonly<Record<string, Lips3DForm>> = {
  "001": { width: .98, upperFullness: .92, lowerFullness: 1.03, cupidDip: .035, smileLift: .025, aperture: .075, teeth: .045 }, "011": { width: 1.07, upperFullness: 1.08, lowerFullness: 1.14, cupidDip: .065, smileLift: .105, aperture: .17, teeth: .13 }, "030": { width: .94, upperFullness: 1.1, lowerFullness: 1.2, cupidDip: .025, smileLift: -.015, aperture: .045, teeth: 0 }, "035": { width: 1.13, upperFullness: .86, lowerFullness: .96, cupidDip: .018, smileLift: .015, aperture: .055, teeth: .025 }, "078": { width: 1.16, upperFullness: .88, lowerFullness: 1.04, cupidDip: .02, smileLift: .12, aperture: .15, teeth: .115 },
};
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
function formFrom(source: Observation | null): Lips3DForm {
  if (!source) return { width: 1, upperFullness: 1, lowerFullness: 1, cupidDip: .03, smileLift: 0, aperture: .06, teeth: 0 };
  const relativeWidth = source.width / source.faceWidth, aspect = source.height / source.width;
  return { width: clamp(.76 + relativeWidth * 3.4, .86, 1.18), upperFullness: clamp(.76 + aspect * 2.8 + source.centerDip * .9, .78, 1.22), lowerFullness: clamp(.82 + aspect * 3.35, .84, 1.28), cupidDip: clamp(.015 + source.centerDip * .22, .012, .075), smileLift: clamp(source.endpointLift * .42, -.12, .13), aperture: clamp((aspect - .12) * .56, .025, .17), teeth: 0 };
}
function formFromUpgrade(source: UpgradeEntry): Lips3DForm {
  const [width, height] = source.outerLipsPx.split("x").map(Number);
  const aspect = height / width;
  return { width: clamp(.96 + (aspect - .25) * .42, .88, 1.12), upperFullness: clamp(.77 + aspect * 1.28, .82, 1.16), lowerFullness: clamp(.84 + aspect * 1.64, .88, 1.25), cupidDip: clamp(.02 + aspect * .08, .025, .065), smileLift: 0, aperture: clamp((aspect - .12) * .46, .025, .15), teeth: 0 };
}
/** Ordered by original story index: index N is the Nth `techPowerFaces` person. */
export const lips3DStudies: readonly Lips3DStudy[] = techPowerFaces.map((person, storyIndex) => {
  const profile = byId.get(person.id), baseline = baselineForms[person.id], upgrade = sourceUpgrades.get(person.id);
  // 030/035 retain accepted matching crops from the five-person baseline.
  // The other small-source studies deliberately use their own V2 crop: it is
  // low resolution, but remains the named person's photograph on 3D tissue.
  const baselinePreserved = Boolean(baseline && !profile?.usable);
  const useV2Crop = !upgrade && !profile?.usable && !baselinePreserved;
  const v2ComparisonImage = `/images/0908/tech-power-lips-v2/${person.id}.jpg`;
  return { storyIndex, id: person.id, name: person.name, affiliation: person.affiliation, sourceImage: upgrade?.crop ?? (useV2Crop ? v2ComparisonImage : `/images/0922/lips-3d/${person.id}.jpg`), v2ComparisonImage, usable: true, sourceQuality: upgrade ? "source-upgrade" : baselinePreserved ? "baseline-preserved" : profile?.quality ?? "unusable", ...(profile?.reason && !upgrade ? { qualityReason: profile.reason } : {}), framing: upgrade || profile?.quality === "usable" ? "well-framed" : "v2-clipped", form: baseline ?? (upgrade ? formFromUpgrade(upgrade) : formFrom(profile?.mouth ?? null)) };
});
/** Same order as `techPowerFaces`; integration may pass `story.index` directly. */
export const lips3DTrialSourceIndices = lips3DStudies.map((study) => study.storyIndex);
export const lips3DSourceQualityExceptions = lips3DStudies.filter((study) => !study.usable || study.sourceQuality !== "usable");
