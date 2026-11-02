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

// Life stages and the age, in years, each begins. A stage without signs of
// its own borrows the nearest earlier stage's.
export const STAGES = [
  { id: "birth", from: 0 }, // 산후조리원, 산부인과, 백일·돌잔치, 돌사진
  { id: "daycare", from: 2 }, // 어린이집 대기, 소아청소년과, 키즈카페
  { id: "kinder", from: 5 }, // 영어유치원, 유치원, 학습지, 태권도, 피아노
  { id: "elementary", from: 8 }, // 초등 학원가: 영어·수학, 태권도, 미술
  { id: "middle", from: 13 }, // 내신 학원, 독서실
  { id: "high", from: 16 }, // 입시학원, 독서실, 수능
  { id: "twenties", from: 19 }, // 재수학원, 원룸텔·고시텔, 공무원·어학원, 술집
  { id: "marriage", from: 25 }, // 취업, 예식장·웨딩홀, 결혼정보, 회식
  { id: "family", from: 30 }, // 부동산, 은행, 생활 간판
  { id: "work", from: 40 }, // 승진과 회식: 횟집, 노래방, 호프
  { id: "retire", from: 55 }, // 치킨집 창업, 부동산
  { id: "oldage", from: 65 }, // 요양원, 한의원, 정형외과, 약국
  { id: "hospital", from: 80 }, // 요양병원, 병원, 장례식장
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
];
