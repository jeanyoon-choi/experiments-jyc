// Korean street signs cut out of photographs and rectified to their front
// face, 120px high (sources in the docs). The page loads and decodes each
// once; every game document draws its obstacle sprites from these shared
// images (window.spoonClassSigns) instead of carrying its own copies.
//
// Kinds pick where a sign may stand: 입간판 (stand, aframe, cylinder,
// lightbox) on the small obstacles; 세로간판 (vertical, neon, hagwon-v) and
// 학원 facades (hagwon) on the large ones.
import type { StaticImageData } from "next/image";
import aframe from "./source/signs/aframe.jpg";
import otsuseonBox from "./source/signs/otsuseon-box.jpg";
import standBlue from "./source/signs/stand-blue.jpg";
import insaengCyl from "./source/signs/insaeng-cyl.jpg";
import muhanRefill from "./source/signs/muhan-refill.jpg";
import allNight from "./source/signs/all-night.jpg";
import sugarSkull from "./source/signs/sugar-skull.jpg";
import camping from "./source/signs/camping.jpg";
import sajingwan from "./source/signs/sajingwan.jpg";
import makhoe from "./source/signs/makhoe.jpg";
import masanAgu from "./source/signs/masan-agu.jpg";
import iwonhwa from "./source/signs/iwonhwa.jpg";
import saengmaekju from "./source/signs/saengmaekju.jpg";
import hwanggeum from "./source/signs/hwanggeum.jpg";
import bihaenggiV from "./source/signs/bihaenggi-v.jpg";
import starNorae from "./source/signs/star-norae.jpg";
import dukkeop from "./source/signs/dukkeop.jpg";
import ivyRoomtel from "./source/signs/ivy-roomtel.jpg";
import euljimaekju from "./source/signs/euljimaekju.jpg";
import galchi from "./source/signs/galchi.jpg";
import gyeongseo from "./source/signs/gyeongseo.jpg";
import rockNorae from "./source/signs/rock-norae.jpg";
import insaeng from "./source/signs/insaeng.jpg";
import bangiok from "./source/signs/bangiok.jpg";
import hwangso from "./source/signs/hwangso.jpg";
import zippo from "./source/signs/zippo.jpg";
import haemulAgu from "./source/signs/haemul-agu.jpg";
import jazz from "./source/signs/jazz.jpg";
import greenBanner from "./source/signs/green-banner.jpg";
import yellowMenu from "./source/signs/yellow-menu.jpg";
import aramV from "./source/signs/aram-v.jpg";
import pilV from "./source/signs/pil-v.jpg";
import choigang from "./source/signs/choigang.jpg";
import jypMath from "./source/signs/jyp-math.jpg";
import pilPurple from "./source/signs/pil-purple.jpg";
import seumWhite from "./source/signs/seum-white.jpg";
import aramWhite from "./source/signs/aram-white.jpg";
import gnbEnglish from "./source/signs/gnb-english.jpg";
import haebeopMath from "./source/signs/haebeop-math.jpg";

export type SignKind =
  | "stand"
  | "aframe"
  | "cylinder"
  | "lightbox"
  | "vertical"
  | "neon"
  | "hagwon-v"
  | "hagwon";

export const SIGNS: { id: string; image: StaticImageData; kind: SignKind }[] = [
  { id: "aframe", image: aframe, kind: "aframe" },
  { id: "otsuseon-box", image: otsuseonBox, kind: "stand" },
  { id: "stand-blue", image: standBlue, kind: "stand" },
  { id: "insaeng-cyl", image: insaengCyl, kind: "cylinder" },
  { id: "muhan-refill", image: muhanRefill, kind: "lightbox" },
  { id: "all-night", image: allNight, kind: "lightbox" },
  { id: "sugar-skull", image: sugarSkull, kind: "lightbox" },
  { id: "camping", image: camping, kind: "lightbox" },
  { id: "sajingwan", image: sajingwan, kind: "lightbox" },
  { id: "makhoe", image: makhoe, kind: "lightbox" },
  { id: "masan-agu", image: masanAgu, kind: "lightbox" },
  { id: "iwonhwa", image: iwonhwa, kind: "neon" },
  { id: "saengmaekju", image: saengmaekju, kind: "neon" },
  { id: "hwanggeum", image: hwanggeum, kind: "neon" },
  { id: "bihaenggi-v", image: bihaenggiV, kind: "neon" },
  { id: "star-norae", image: starNorae, kind: "neon" },
  { id: "dukkeop", image: dukkeop, kind: "vertical" },
  { id: "ivy-roomtel", image: ivyRoomtel, kind: "vertical" },
  { id: "euljimaekju", image: euljimaekju, kind: "vertical" },
  { id: "galchi", image: galchi, kind: "vertical" },
  { id: "gyeongseo", image: gyeongseo, kind: "vertical" },
  { id: "rock-norae", image: rockNorae, kind: "vertical" },
  { id: "insaeng", image: insaeng, kind: "vertical" },
  { id: "bangiok", image: bangiok, kind: "vertical" },
  { id: "hwangso", image: hwangso, kind: "vertical" },
  { id: "zippo", image: zippo, kind: "vertical" },
  { id: "haemul-agu", image: haemulAgu, kind: "vertical" },
  { id: "jazz", image: jazz, kind: "vertical" },
  { id: "green-banner", image: greenBanner, kind: "vertical" },
  { id: "yellow-menu", image: yellowMenu, kind: "vertical" },
  { id: "aram-v", image: aramV, kind: "hagwon-v" },
  { id: "pil-v", image: pilV, kind: "hagwon-v" },
  { id: "choigang", image: choigang, kind: "hagwon" },
  { id: "jyp-math", image: jypMath, kind: "hagwon" },
  { id: "pil-purple", image: pilPurple, kind: "hagwon" },
  { id: "seum-white", image: seumWhite, kind: "hagwon" },
  { id: "aram-white", image: aramWhite, kind: "hagwon" },
  { id: "gnb-english", image: gnbEnglish, kind: "hagwon" },
  { id: "haebeop-math", image: haebeopMath, kind: "hagwon" },
];
