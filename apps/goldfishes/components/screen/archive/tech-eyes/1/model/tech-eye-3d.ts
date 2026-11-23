import photoProfiles from "./tech-eye-3d-profiles.generated.json";
import { techPowerFaces } from "./tech-power-faces.generated";

// Pixels come from the same portraits as the 2D archive. Hidden anatomy and
// microstructure are authored estimates, never claimed as measured scans.
export const techEye3DStudies = techPowerFaces.map((person, index) => {
  const source = photoProfiles.find((profile) => profile.id === person.id)!;
  return {
    index, id: person.id, name: person.name, affiliation: person.affiliation,
    sourceImage: `${source.sourceImage}?v=${source.size.join("x")}`,
    profile: { size: source.size, crop: source.crop, eye: source.eye, pupil: source.pupil, iris: source.iris },
  };
});
