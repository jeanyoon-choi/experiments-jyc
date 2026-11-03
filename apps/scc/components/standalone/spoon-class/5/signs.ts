// Korean street signs cut out of photographs and rectified to their front
// face, 120px high (sources in the docs). The page loads and decodes each
// once; every game document draws its obstacle sprites from these shared
// images (window.spoonClassSigns) instead of carrying its own copies.
//
// Kinds pick where a sign may stand: 입간판 (stand, aframe, cylinder,
// lightbox) on the small obstacles; 세로간판 (vertical, neon, hagwon-v) and
// facades (hagwon) on the large ones. Stages pick when: the age clock
// (six months a second) moves the obstacles through STAGES.
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
import dusanDaycare from "./source/signs/dusan-daycare.jpg";
import dusanDoor from "./source/signs/dusan-door.jpg";
import yunsooTaekwondo from "./source/signs/yunsoo-taekwondo.jpg";
import subinPiano from "./source/signs/subin-piano.jpg";
import haebeopEnglish from "./source/signs/haebeop-english.jpg";
import dokkaebiPiano from "./source/signs/dokkaebi-piano.jpg";
import jisomRealty from "./source/signs/jisom-realty.jpg";
import pianoLibre from "./source/signs/piano-libre.jpg";
import torActing from "./source/signs/tor-acting.jpg";
import torBox from "./source/signs/tor-box.jpg";
import dsSports from "./source/signs/ds-sports.jpg";
import beableStudy from "./source/signs/beable-study.jpg";
import cheongjeonHouse from "./source/signs/cheongjeon-house.jpg";
import cheongjeonV from "./source/signs/cheongjeon-v.jpg";
import salonWedding from "./source/signs/salon-wedding.jpg";
import yegaBubu from "./source/signs/yega-bubu.jpg";
import soriHearing from "./source/signs/sori-hearing.jpg";
import samsungOrtho from "./source/signs/samsung-ortho.jpg";
import sanbu from "./source/signs/sanbu.jpg";
import seongmoEye from "./source/signs/seongmo-eye.jpg";
import saebitPharmacy from "./source/signs/saebit-pharmacy.jpg";
import funeralHall from "./source/signs/funeral-hall.jpg";
import bossChicken from "./source/signs/boss-chicken.jpg";
import chakhanFuneral from "./source/signs/chakhan-funeral.jpg";
import cheonsaLife from "./source/signs/cheonsa-life.jpg";
import hangyeolLabor from "./source/signs/hangyeol-labor.jpg";
import yoyangPlaque from "./source/signs/yoyang-plaque.jpg";
import hanyangPlaque from "./source/signs/hanyang-plaque.jpg";
import gcovaStand from "./source/signs/gcova-stand.jpg";
import gcovaBand from "./source/signs/gcova-band.jpg";
import yoyangEdu from "./source/signs/yoyang-edu.jpg";
import sionV from "./source/signs/sion-v.jpg";
import bohoCenter from "./source/signs/boho-center.jpg";
import tileCognitive from "./source/signs/tile-cognitive.jpg";
import tileRehab from "./source/signs/tile-rehab.jpg";
import tileVisitCare from "./source/signs/tile-visit-care.jpg";
import tileVisitBath from "./source/signs/tile-visit-bath.jpg";
import picassoBox from "./source/signs/picasso-box.jpg";
import picassoBand from "./source/signs/picasso-band.jpg";
import jayeonArt from "./source/signs/jayeon-art.jpg";
import gwangjangPhoto from "./source/signs/gwangjang-photo.jpg";
import beerChicken from "./source/signs/beer-chicken.jpg";
import gamaekBox from "./source/signs/gamaek-box.jpg";
import beerBox from "./source/signs/beer-box.jpg";
import sanhuPoster from "./source/signs/sanhu-poster.jpg";
import sanmoPoster from "./source/signs/sanmo-poster.jpg";

// Life stages and the age, in years, each begins. A stage without signs of
// its own borrows the nearest earlier stage's.
export const STAGES = [
  { id: "birth", from: 0 }, // 산부인과, 산후관리사, 사진관
  { id: "daycare", from: 2 }, // 어린이집
  { id: "kinder", from: 5 }, // 영어교실, 피아노, 태권도, 아동미술
  { id: "elementary", from: 8 }, // 초등 학원가: 영어·수학, 태권도, 미술
  { id: "middle", from: 13 }, // 내신 학원
  { id: "high", from: 16 }, // 입시학원, 연기 입시, 스터디카페
  { id: "twenties", from: 19 }, // 체대·공무원 입시, 고시텔, 술집
  { id: "marriage", from: 25 }, // 웨딩 메이크업·드레스, 부부 한의원, 회식
  { id: "family", from: 30 }, // 부동산, 생활 간판
  { id: "work", from: 40 }, // 정형외과, 횟집, 노래방, 호프
  { id: "retire", from: 55 }, // 치킨집 창업, 인력사무소, 부동산
  { id: "oldage", from: 65 }, // 보청기, 주야간보호·방문요양, 안과, 약국
  { id: "hospital", from: 80 }, // 요양병원, 대학병원, 장례식장, 상조
] as const;

export type StageId = (typeof STAGES)[number]["id"];

export type SignKind =
  | "stand"
  | "aframe"
  | "cylinder"
  | "lightbox"
  | "vertical"
  | "neon"
  | "hagwon-v"
  | "hagwon";

export const SIGNS: {
  id: string;
  image: StaticImageData;
  kind: SignKind;
  stages: readonly StageId[];
}[] = [
  { id: "aframe", image: aframe, kind: "aframe", stages: ["family"] },
  { id: "otsuseon-box", image: otsuseonBox, kind: "stand", stages: ["family"] },
  { id: "stand-blue", image: standBlue, kind: "stand", stages: ["twenties"] },
  { id: "insaeng-cyl", image: insaengCyl, kind: "cylinder", stages: ["work"] },
  { id: "muhan-refill", image: muhanRefill, kind: "lightbox", stages: ["work"] },
  { id: "all-night", image: allNight, kind: "lightbox", stages: ["twenties"] },
  { id: "sugar-skull", image: sugarSkull, kind: "lightbox", stages: ["twenties"] },
  { id: "camping", image: camping, kind: "lightbox", stages: ["twenties", "work"] },
  { id: "sajingwan", image: sajingwan, kind: "lightbox", stages: ["birth"] },
  { id: "makhoe", image: makhoe, kind: "lightbox", stages: ["work"] },
  { id: "masan-agu", image: masanAgu, kind: "lightbox", stages: ["work"] },
  { id: "iwonhwa", image: iwonhwa, kind: "neon", stages: ["work"] },
  { id: "saengmaekju", image: saengmaekju, kind: "neon", stages: ["twenties", "marriage", "work"] },
  { id: "hwanggeum", image: hwanggeum, kind: "neon", stages: ["twenties", "marriage", "work"] },
  { id: "bihaenggi-v", image: bihaenggiV, kind: "neon", stages: ["twenties", "work"] },
  { id: "star-norae", image: starNorae, kind: "neon", stages: ["twenties", "marriage"] },
  { id: "dukkeop", image: dukkeop, kind: "vertical", stages: ["twenties"] },
  { id: "ivy-roomtel", image: ivyRoomtel, kind: "vertical", stages: ["twenties"] },
  { id: "euljimaekju", image: euljimaekju, kind: "vertical", stages: ["twenties", "work"] },
  { id: "galchi", image: galchi, kind: "vertical", stages: ["work"] },
  { id: "gyeongseo", image: gyeongseo, kind: "vertical", stages: ["work"] },
  { id: "rock-norae", image: rockNorae, kind: "vertical", stages: ["twenties"] },
  { id: "insaeng", image: insaeng, kind: "vertical", stages: ["work"] },
  { id: "bangiok", image: bangiok, kind: "vertical", stages: ["work"] },
  { id: "hwangso", image: hwangso, kind: "vertical", stages: ["work"] },
  { id: "zippo", image: zippo, kind: "vertical", stages: ["twenties"] },
  { id: "haemul-agu", image: haemulAgu, kind: "vertical", stages: ["work"] },
  { id: "jazz", image: jazz, kind: "vertical", stages: ["twenties"] },
  { id: "green-banner", image: greenBanner, kind: "vertical", stages: ["family"] },
  { id: "yellow-menu", image: yellowMenu, kind: "vertical", stages: ["work"] },
  { id: "aram-v", image: aramV, kind: "hagwon-v", stages: ["middle", "high"] },
  { id: "pil-v", image: pilV, kind: "hagwon-v", stages: ["elementary", "middle"] },
  { id: "choigang", image: choigang, kind: "hagwon", stages: ["elementary", "middle"] },
  { id: "jyp-math", image: jypMath, kind: "hagwon", stages: ["middle", "high"] },
  { id: "pil-purple", image: pilPurple, kind: "hagwon", stages: ["middle", "high"] },
  { id: "seum-white", image: seumWhite, kind: "hagwon", stages: ["elementary", "middle"] },
  { id: "aram-white", image: aramWhite, kind: "hagwon", stages: ["high"] },
  { id: "gnb-english", image: gnbEnglish, kind: "hagwon", stages: ["kinder", "elementary"] },
  { id: "haebeop-math", image: haebeopMath, kind: "hagwon", stages: ["elementary"] },
  { id: "dusan-daycare", image: dusanDaycare, kind: "hagwon", stages: ["daycare"] },
  { id: "dusan-door", image: dusanDoor, kind: "lightbox", stages: ["daycare"] },
  { id: "yunsoo-taekwondo", image: yunsooTaekwondo, kind: "hagwon", stages: ["kinder", "elementary"] },
  { id: "subin-piano", image: subinPiano, kind: "hagwon", stages: ["kinder"] },
  { id: "haebeop-english", image: haebeopEnglish, kind: "hagwon", stages: ["kinder", "elementary"] },
  { id: "dokkaebi-piano", image: dokkaebiPiano, kind: "hagwon", stages: ["kinder"] },
  { id: "jisom-realty", image: jisomRealty, kind: "hagwon", stages: ["family", "retire"] },
  { id: "piano-libre", image: pianoLibre, kind: "cylinder", stages: ["kinder", "elementary"] },
  { id: "tor-acting", image: torActing, kind: "hagwon", stages: ["high"] },
  { id: "tor-box", image: torBox, kind: "lightbox", stages: ["high", "middle"] },
  { id: "ds-sports", image: dsSports, kind: "hagwon", stages: ["high", "twenties"] },
  { id: "beable-study", image: beableStudy, kind: "hagwon", stages: ["high", "twenties"] },
  { id: "cheongjeon-house", image: cheongjeonHouse, kind: "hagwon", stages: ["twenties"] },
  { id: "cheongjeon-v", image: cheongjeonV, kind: "vertical", stages: ["twenties"] },
  { id: "salon-wedding", image: salonWedding, kind: "hagwon", stages: ["marriage"] },
  { id: "yega-bubu", image: yegaBubu, kind: "hagwon", stages: ["marriage"] },
  { id: "sori-hearing", image: soriHearing, kind: "hagwon", stages: ["oldage"] },
  { id: "samsung-ortho", image: samsungOrtho, kind: "hagwon", stages: ["work", "oldage"] },
  { id: "sanbu", image: sanbu, kind: "hagwon", stages: ["birth"] },
  { id: "seongmo-eye", image: seongmoEye, kind: "hagwon", stages: ["oldage"] },
  { id: "saebit-pharmacy", image: saebitPharmacy, kind: "lightbox", stages: ["oldage", "hospital"] },
  { id: "funeral-hall", image: funeralHall, kind: "hagwon", stages: ["hospital"] },
  { id: "boss-chicken", image: bossChicken, kind: "hagwon", stages: ["retire"] },
  { id: "chakhan-funeral", image: chakhanFuneral, kind: "hagwon", stages: ["hospital"] },
  { id: "cheonsa-life", image: cheonsaLife, kind: "hagwon", stages: ["hospital"] },
  { id: "hangyeol-labor", image: hangyeolLabor, kind: "hagwon", stages: ["retire"] },
  { id: "yoyang-plaque", image: yoyangPlaque, kind: "lightbox", stages: ["oldage", "hospital"] },
  { id: "hanyang-plaque", image: hanyangPlaque, kind: "lightbox", stages: ["hospital"] },
  { id: "gcova-stand", image: gcovaStand, kind: "stand", stages: ["retire"] },
  { id: "gcova-band", image: gcovaBand, kind: "hagwon", stages: ["retire"] },
  { id: "yoyang-edu", image: yoyangEdu, kind: "hagwon", stages: ["oldage"] },
  { id: "sion-v", image: sionV, kind: "vertical", stages: ["oldage"] },
  { id: "boho-center", image: bohoCenter, kind: "hagwon", stages: ["oldage"] },
  { id: "tile-cognitive", image: tileCognitive, kind: "hagwon", stages: ["oldage"] },
  { id: "tile-rehab", image: tileRehab, kind: "hagwon", stages: ["oldage"] },
  { id: "tile-visit-care", image: tileVisitCare, kind: "hagwon", stages: ["oldage"] },
  { id: "tile-visit-bath", image: tileVisitBath, kind: "hagwon", stages: ["oldage"] },
  { id: "picasso-box", image: picassoBox, kind: "lightbox", stages: ["kinder", "elementary"] },
  { id: "picasso-band", image: picassoBand, kind: "hagwon", stages: ["kinder", "elementary"] },
  { id: "jayeon-art", image: jayeonArt, kind: "hagwon", stages: ["elementary"] },
  { id: "gwangjang-photo", image: gwangjangPhoto, kind: "hagwon", stages: ["birth"] },
  { id: "beer-chicken", image: beerChicken, kind: "hagwon", stages: ["work", "retire"] },
  { id: "gamaek-box", image: gamaekBox, kind: "lightbox", stages: ["work"] },
  { id: "beer-box", image: beerBox, kind: "lightbox", stages: ["twenties", "work"] },
  { id: "sanhu-poster", image: sanhuPoster, kind: "lightbox", stages: ["birth"] },
  { id: "sanmo-poster", image: sanmoPoster, kind: "lightbox", stages: ["birth"] },
];
