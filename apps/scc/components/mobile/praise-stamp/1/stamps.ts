import type { Rgb } from "./ink";
import { LW, type Pen } from "./pen";

// Pad colours of Korean classroom stamp inks.
export const INKS = {
  red: [204, 38, 44],
  crimson: [178, 28, 52],
  blue: [44, 52, 178],
  violet: [92, 44, 158],
  navy: [30, 42, 104],
  black: [38, 34, 40],
  green: [24, 118, 72],
  pink: [214, 58, 112],
  orange: [222, 84, 40],
} as const satisfies Record<string, Rgb>;

export type Stamp = {
  /** Stable id. */
  id: string;
  ink: keyof typeof INKS;
  /** Face size relative to the cell (real stamps run 16–26 mm). */
  size: number;
  draw: (p: Pen) => void;
};

const R = 470; // outer ring radius of a round face

export const STAMPS: readonly Stamp[] = [
  // --- Traced from real impressions and catalogue sheets ---------------------
  { id: "geom", ink: "blue", size: 0.92, draw: (p) => p.traced("geom") },
  { id: "chamjal-crowns", ink: "red", size: 1, draw: (p) => p.traced("crowns") },
  { id: "jom-deo-yeolsimhi", ink: "black", size: 0.92, draw: (p) => p.traced("turtle") },
  { id: "chamjal-thumb-stars", ink: "crimson", size: 1, draw: (p) => p.traced("thumbstars") },
  { id: "chamjal-very-good", ink: "blue", size: 0.96, draw: (p) => p.traced("verygood") },
  { id: "eomji-hwagin", ink: "red", size: 0.96, draw: (p) => p.traced("hexcheck") },

  // --- The old rubber teacher stamps ---------------------------------------
  {
    id: "chamjal-classic",
    ink: "violet",
    size: 0.98,
    draw: (p) => {
      p.ring(R, LW * 0.9);
      p.arcText("참!잘했어요", 350, "dodum", 118, "top", { tracking: 4 });
      p.face(372, 585, 150, { hair: "cap", mouth: "open" });
      p.face(632, 590, 145, { hair: "curly", bow: true, eyes: "happy", mouth: "open" });
    },
  },
  {
    id: "jalhaesseoyo-flower",
    ink: "red",
    size: 0.92,
    draw: (p) => {
      p.ring(R, LW * 0.9);
      p.flower(500, 430, 230);
      p.arcText("잘했어요", 360, "dodum", 124, "bottom", { tracking: 10 });
    },
  },
  {
    id: "noryeokhaseyo-owl",
    ink: "blue",
    size: 0.92,
    draw: (p) => {
      p.ring(R, LW * 0.9);
      p.owl(500, 420, 420);
      p.arcText("노력하세요", 365, "dodum", 112, "bottom", { tracking: 8 });
    },
  },
  {
    id: "eomeoni-dowa",
    ink: "black",
    size: 0.96,
    draw: (p) => {
      p.ring(R, LW);
      p.owl(470, 400, 470);
      p.arcText("어머니도와주세요", 372, "dodum", 96, "bottom", { tracking: 2 });
    },
  },
  {
    id: "geom-plain",
    ink: "red",
    size: 0.7,
    draw: (p) => {
      p.ring(R, LW * 1.3);
      p.ring(R - 52, LW * 0.7);
      p.text("검", 500, 512, "hansans", 520);
    },
  },
  {
    id: "geomsa-square",
    ink: "red",
    size: 0.66,
    draw: (p) => {
      p.rect(900, 900, 40, LW * 1.6);
      p.text("검", 500, 290, "hansans", 380);
      p.text("사", 500, 700, "hansans", 380);
    },
  },
  {
    id: "hwagin",
    ink: "red",
    size: 0.72,
    draw: (p) => {
      p.ring(R, LW * 1.4);
      p.text("확인", 500, 515, "hansans", 300, { tracking: 10 });
    },
  },

  // --- Report-card grades ---------------------------------------------------
  ...(["수", "우", "미", "양", "가"] as const).map((grade, i): Stamp => ({
    id: `grade-${i}`,
    ink: (["violet", "blue", "red", "navy", "black"] as const)[i],
    size: 0.78,
    draw: (p) => {
      if (i < 3) {
        p.laurel(370, 200, 338, 8, 1.2);
        p.text(grade, 500, 470, "hansans", 400);
      } else {
        p.ring(R, LW * 1.2);
        p.ring(R - 46, LW * 0.6);
        p.text(grade, 500, 512, "hansans", 460);
      }
    },
  })),

  // --- Today's 칭찬 stamps --------------------------------------------------
  {
    id: "hanamaru",
    ink: "red",
    size: 0.86,
    draw: (p) => {
      p.hanamaru(500, 410, 330);
      p.text("참 잘했어요", 500, 860, "jua", 132);
    },
  },
  {
    id: "choegoyeyo-crown",
    ink: "red",
    size: 0.96,
    draw: (p) => {
      p.ring(R, LW);
      p.ring(R - 40, LW * 0.6);
      p.crown(500, 300, 300);
      p.text("최고예요", 500, 560, "jua", 190);
      p.starRow(5, 760, 105, 40, 30);
    },
  },
  {
    id: "choegoya-thumbs",
    ink: "violet",
    size: 0.92,
    draw: (p) => {
      p.ring(R, LW * 1.2);
      p.thumb(380, 460, 330, LW, false);
      p.thumb(630, 460, 330, LW, true);
      p.text("최고야!", 500, 790, "dohyeon", 160);
    },
  },
  {
    id: "meotjyeoyo",
    ink: "blue",
    size: 0.9,
    draw: (p) => {
      p.ring(R, LW);
      p.starFace(500, 420, 270);
      p.sparks(500, 420, 300, 360, -60, 60, 3);
      p.arcText("멋져요", 360, "jua", 140, "bottom", { tracking: 12 });
    },
  },
  {
    id: "hullyunghaeyo-medal",
    ink: "navy",
    size: 0.92,
    draw: (p) => {
      p.ring(R, LW);
      p.dots(R - 50, 40, 9);
      p.medal(500, 470, 140);
      p.arcText("훌륭해요", 345, "jua", 120, "bottom", { tracking: 10 });
    },
  },
  {
    id: "daedanhaeyo-trophy",
    ink: "red",
    size: 0.92,
    draw: (p) => {
      p.scallop(430, 16, 34, LW);
      p.trophy(500, 400, 330);
      p.text("대단해요", 500, 700, "jua", 140);
    },
  },
  {
    id: "joayo-heart",
    ink: "pink",
    size: 0.82,
    draw: (p) => {
      p.heart(500, 470, 380, false, LW * 1.2);
      p.text("좋아요", 500, 470, "jua", 150);
    },
  },
  {
    id: "saranghaeyo",
    ink: "red",
    size: 0.9,
    draw: (p) => {
      p.ring(R, LW);
      p.heart(500, 400, 170, true);
      p.heart(330, 330, 60, false, LW * 0.8);
      p.heart(680, 320, 50, true);
      p.text("사랑해요", 500, 720, "gaegu", 150);
    },
  },
  {
    id: "eungwonhaeyo",
    ink: "red",
    size: 0.94,
    draw: (p) => {
      p.ring(R, LW);
      p.face(500, 420, 150, { hair: "pigtails", eyes: "happy", mouth: "open", cheeks: true });
      p.pompom(285, 520, 85);
      p.pompom(715, 520, 85);
      p.arcText("응원해요", 360, "jua", 120, "bottom", { tracking: 10 });
    },
  },
  {
    id: "himnaeyo-sun",
    ink: "orange",
    size: 0.9,
    draw: (p) => {
      p.ring(R, LW);
      p.sun(500, 400, 150);
      p.text("힘내요!", 500, 760, "jua", 150);
    },
  },
  {
    id: "hal-su-isseo",
    ink: "blue",
    size: 0.94,
    draw: (p) => {
      p.ring(R, LW);
      p.ring(R - 36, LW * 0.5);
      p.arcText("할 수 있어요", 345, "jua", 110, "top", { tracking: 6 });
      p.face(500, 540, 170, { hair: "boy", eyes: "dot", mouth: "grin" });
      p.sparks(500, 540, 220, 280, -70, -20, 3);
      p.sparks(500, 540, 220, 280, 20, 70, 3);
    },
  },
  {
    id: "noryeokhaesseoyo-snail",
    ink: "green",
    size: 0.9,
    draw: (p) => {
      p.ring(R, LW);
      p.snail(500, 430, 440);
      p.arcText("노력했어요", 360, "jua", 120, "bottom", { tracking: 8 });
    },
  },
  {
    id: "dasi-haebwayo",
    ink: "blue",
    size: 0.88,
    draw: (p) => {
      p.ring(R, LW);
      p.ring(R - 40, LW * 0.6, 500, 500);
      p.pencil(500, 380, 430, -30);
      p.text("다시 해봐요", 500, 680, "gaegu", 120);
    },
  },
  {
    id: "chingchanhaeyo-flower",
    ink: "violet",
    size: 0.92,
    draw: (p) => {
      p.scallop(440, 12, 30, LW);
      p.flower(500, 420, 210);
      p.text("칭찬해요", 500, 760, "jua", 128);
    },
  },
  {
    id: "giteukhaeyo-chick",
    ink: "orange",
    size: 0.88,
    draw: (p) => {
      p.ring(R, LW);
      p.chick(500, 410, 170);
      p.arcText("기특해요", 360, "jua", 120, "bottom", { tracking: 10 });
    },
  },
  {
    id: "chakaeyo-angel",
    ink: "blue",
    size: 0.9,
    draw: (p) => {
      p.ring(R, LW);
      p.ellipse(120, 34, LW * 0.8, 500, 215);
      p.face(500, 430, 160, { hair: "girl", eyes: "happy", mouth: "smile", cheeks: true });
      p.arcText("착해요", 360, "jua", 130, "bottom", { tracking: 16 });
    },
  },
  {
    id: "yeppeoyo-rabbit",
    ink: "pink",
    size: 0.9,
    draw: (p) => {
      p.ring(R, LW);
      p.rabbit(500, 480, 170);
      p.arcText("예뻐요", 365, "jua", 130, "bottom", { tracking: 16 });
    },
  },
  {
    id: "bareun-geulssi",
    ink: "navy",
    size: 0.92,
    draw: (p) => {
      p.rect(880, 880, 120, LW);
      p.book(500, 380, 420);
      p.pencil(650, 440, 240, -55, LW * 0.9);
      p.text("바른 글씨", 500, 735, "dohyeon", 150);
    },
  },
  {
    id: "badasseugi-100",
    ink: "red",
    size: 0.94,
    draw: (p) => {
      p.ring(R, LW);
      p.arcText("받아쓰기", 350, "jua", 110, "top", { tracking: 12 });
      p.text("100", 500, 520, "gaegu", 300, { tracking: -8 });
      p.underline2(500, 650, 420);
      p.starRow(3, 840, 110, 36, 0);
    },
  },
  {
    id: "red-100",
    ink: "red",
    size: 0.82,
    draw: (p) => {
      p.text("100", 500, 440, "gaegu", 440, { tracking: -20, rotate: -8 });
      p.underline2(500, 660, 640, LW * 1.5);
    },
  },
  {
    id: "sukje-kkeut",
    ink: "green",
    size: 0.86,
    draw: (p) => {
      p.ring(R, LW);
      p.check(500, 380, 300);
      p.text("숙제 끝!", 500, 700, "jua", 150);
    },
  },
  {
    id: "ilgi-geomsa",
    ink: "violet",
    size: 0.86,
    draw: (p) => {
      p.rect(860, 860, 60, LW * 1.2);
      p.rect(800, 800, 40, LW * 0.6);
      p.text("일기", 500, 360, "hansans", 230, { tracking: 20 });
      p.text("검사", 500, 650, "hansans", 230, { tracking: 20 });
    },
  },
  {
    id: "dokseowang",
    ink: "blue",
    size: 0.92,
    draw: (p) => {
      p.ring(R, LW);
      p.crown(500, 250, 230, true);
      p.book(500, 470, 380);
      p.text("독서왕", 500, 740, "jua", 150);
    },
  },
  {
    id: "balpyowang",
    ink: "red",
    size: 0.92,
    draw: (p) => {
      p.ring(R, LW);
      p.face(450, 470, 150, { hair: "boy", eyes: "dot", mouth: "open" });
      p.raisedHand(450, 470, 150);
      p.arcText("발표왕", 365, "jua", 130, "bottom", { tracking: 16 });
    },
  },
  {
    id: "insawang",
    ink: "green",
    size: 0.9,
    draw: (p) => {
      p.ring(R, LW);
      p.face(500, 440, 160, { hair: "girl", eyes: "happy", mouth: "smile", crown: true });
      p.arcText("인사왕", 365, "jua", 130, "bottom", { tracking: 16 });
    },
  },
  {
    id: "jeongriwang",
    ink: "navy",
    size: 0.9,
    draw: (p) => {
      p.zigzag(420, 24, 40, LW);
      p.crown(500, 330, 280, false);
      p.text("정리왕", 500, 580, "dohyeon", 190);
    },
  },
  {
    id: "usu-banner",
    ink: "violet",
    size: 0.96,
    draw: (p) => {
      p.laurel(400, 200, 300, 7, 1.1);
      p.ribbonBanner(560, 520, 170);
      p.text("우수", 500, 548, "hansans", 140, { tracking: 30 });
      p.starRow(3, 300, 120, 50, 20);
    },
  },
  {
    id: "choeusu",
    ink: "red",
    size: 0.98,
    draw: (p) => {
      p.zigzag(440, 36, 30, LW * 0.9);
      p.ring(380, LW * 0.7);
      p.arcText("최우수", 300, "dohyeon", 120, "top", { tracking: 14 });
      p.star(285, 330, 30);
      p.star(715, 330, 30);
      p.medal(500, 600, 110);
    },
  },
  {
    id: "hapgyeok",
    ink: "red",
    size: 0.82,
    draw: (p) => {
      p.rect(940, 560, 30, LW * 1.6);
      p.rect(880, 500, 20, LW * 0.6);
      p.text("합격", 500, 510, "hansans", 300, { tracking: 40 });
    },
  },
  {
    id: "tonggwa",
    ink: "blue",
    size: 0.78,
    draw: (p) => {
      p.ellipse(470, 300, LW * 1.4);
      p.text("통과", 500, 510, "hansans", 260, { tracking: 30 });
    },
  },
  {
    id: "wallyo",
    ink: "green",
    size: 0.78,
    draw: (p) => {
      p.ring(R, LW * 1.2);
      p.check(500, 320, 240, LW * 1.6);
      p.text("완료", 500, 640, "hansans", 230, { tracking: 20 });
    },
  },
  {
    id: "chamjal-bear",
    ink: "blue",
    size: 0.98,
    draw: (p) => {
      p.ring(R, LW);
      p.arcText("참 잘했어요!", 368, "jua", 116, "top", { tracking: 6 });
      p.bear(500, 540, 175);
      p.starArc(5, 400, 36, 145, 215);
    },
  },
  {
    id: "jalhaesseo-puppy",
    ink: "red",
    size: 0.92,
    draw: (p) => {
      p.ring(R, LW);
      p.puppy(500, 440, 165);
      p.arcText("잘했어!", 365, "jua", 130, "bottom", { tracking: 16 });
    },
  },
  {
    id: "daedanhae-cat",
    ink: "violet",
    size: 0.92,
    draw: (p) => {
      p.ring(R, LW);
      p.dots(R - 46, 48, 7);
      p.cat(500, 450, 170);
      p.arcText("대단해", 360, "jua", 120, "bottom", { tracking: 16 });
    },
  },
  {
    id: "kkomkkomhaeyo",
    ink: "navy",
    size: 0.9,
    draw: (p) => {
      p.ring(R, LW);
      p.magnifier(460, 370, 130);
      p.check(460, 370, 110, LW * 1.1);
      p.text("꼼꼼해요", 500, 740, "jua", 128);
    },
  },
  {
    id: "very-good",
    ink: "red",
    size: 0.88,
    draw: (p) => {
      p.ring(R, LW);
      p.face(500, 400, 160, { hair: "bald", eyes: "happy", mouth: "open", cheeks: true });
      p.arcText("Very Good!", 360, "jua", 116, "bottom", { tracking: 2 });
    },
  },
  {
    id: "excellent",
    ink: "blue",
    size: 0.9,
    draw: (p) => {
      p.zigzag(430, 30, 34, LW * 0.9);
      p.star(500, 380, 170, true);
      p.text("Excellent", 500, 640, "jua", 128);
    },
  },
  {
    id: "good-job",
    ink: "violet",
    size: 0.88,
    draw: (p) => {
      p.ring(R, LW);
      p.thumb(500, 400, 360);
      p.text("Good Job", 500, 750, "jua", 120);
    },
  },
  {
    id: "seonsaengnim-hwagin",
    ink: "red",
    size: 0.78,
    draw: (p) => {
      p.rect(900, 900, 70, LW * 1.4);
      p.text("선생님", 500, 340, "dohyeon", 220, { tracking: 10 });
      p.text("확인", 500, 660, "dohyeon", 260, { tracking: 40 });
    },
  },
  {
    id: "bumonim-hwagin",
    ink: "blue",
    size: 0.78,
    draw: (p) => {
      p.ring(R, LW * 1.3);
      p.arcText("부모님", 345, "dohyeon", 140, "top", { tracking: 20 });
      p.text("확인", 500, 560, "hansans", 230, { tracking: 16 });
    },
  },
  {
    id: "chamjal-hexagon",
    ink: "red",
    size: 0.96,
    draw: (p) => {
      p.poly(6, 480, LW, -90, 40);
      p.poly(6, 430, LW * 0.6, -90, 30);
      p.text("참", 500, 380, "jua", 200);
      p.text("잘했어요", 500, 580, "jua", 150);
      p.starRow(3, 760, 100, 34, 0);
    },
  },
  {
    id: "oneuldo-choego",
    ink: "crimson",
    size: 0.92,
    draw: (p) => {
      p.shield(820, 940, LW * 1.1);
      p.text("오늘도", 500, 260, "jua", 120);
      p.text("최고", 500, 470, "hansans", 260);
      p.starRow(3, 680, 110, 42, 0);
    },
  },
  {
    id: "jiphjung",
    ink: "black",
    size: 0.9,
    draw: (p) => {
      p.ring(R, LW);
      p.face(500, 430, 165, { hair: "boy", eyes: "dot", mouth: "smile" });
      p.pencil(680, 560, 200, -60, LW * 0.8);
      p.arcText("집중했어요", 365, "jua", 112, "bottom", { tracking: 8 });
    },
  },
  {
    id: "haengun-clover",
    ink: "green",
    size: 0.86,
    draw: (p) => {
      p.ring(R, LW);
      p.clover(480, 400, 200);
      p.arcText("최고의 하루", 365, "jua", 110, "bottom", { tracking: 6 });
    },
  },
  {
    id: "chamjal-kids-stars",
    ink: "navy",
    size: 1,
    draw: (p) => {
      p.ring(R, LW * 1.1);
      p.ring(R - 40, LW * 0.6);
      p.arcText("참! 잘했어요", 340, "dohyeon", 120, "top", { tracking: 6 });
      p.face(375, 520, 125, { hair: "boy", eyes: "happy", mouth: "open" });
      p.face(625, 520, 125, { hair: "pigtails", eyes: "happy", mouth: "open", cheeks: true });
      p.starArc(5, 345, 34, 140, 220);
    },
  },
  {
    id: "jalhaesseoyo-heart-ring",
    ink: "crimson",
    size: 0.86,
    draw: (p) => {
      p.ring(R, LW);
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        p.heart(500 + Math.cos(a) * 395, 500 + Math.sin(a) * 395, 26, true);
      }
      p.text("잘", 500, 390, "jua", 230);
      p.text("했어요", 500, 600, "jua", 170);
    },
  },
] as const;
