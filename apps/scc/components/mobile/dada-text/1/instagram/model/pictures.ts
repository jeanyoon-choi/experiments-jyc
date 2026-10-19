/**
 * Pictures shown as they are among the Explore grid's word tiles (user, 2026-10-19: a test). Portraits from
 * /screen/tech-eyes/1's Wikimedia Commons set, already in `public/` (attribution in
 * public/images/0908/tech-power-faces/attribution.json); copied as paths, nothing imported from another experiment.
 */
export type Picture = { id: string; name: string; image: string };

const face = (id: string, name: string): Picture => ({ id, name, image: `/images/0908/tech-power-faces/${id}.jpg` });

export const pictures: readonly Picture[] = [
  face("001", "Sam Altman"),
  face("002", "Mark Zuckerberg"),
  face("003", "Jensen Huang"),
  face("008", "Elon Musk"),
  face("004", "Sundar Pichai"),
  face("006", "Satya Nadella"),
  face("007", "Tim Cook"),
  face("009", "Demis Hassabis"),
];

/** A post's own picture under 자율: the same one each time that tile turns. */
export const pictureFor = (id: string) => pictures[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % pictures.length];
