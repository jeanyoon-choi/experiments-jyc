import { both } from "./text.ts";
import type { Reference } from "./types.ts";

// Things to look at beside the work. A reference is never a specification:
// nothing here is a rule the system follows, and none is cited as a claim.
export const REFERENCES: Reference[] = [
  {
    id: "agent-models",
    title: both("에이전트 모델 도감", "A specimen book of agent models"),
    href: "/screen/simulation/reference/agent-models.html",
    file: "public/screen/simulation/reference/agent-models.html",
    date: "2026-11-24",
    about: ["gb-screen"],
    note: both(
      "대표 ABM 24가지를 한 판씩: 설명, 구조 도식, 식, 돌려 볼 수 있는 시뮬레이션, 원논문. 나중에 simulation을 넓힐 때 견주어 보는 용도다. 작품이 따라 할 모델이 아니다 (작가, 2026-11-24).",
      "Twenty-four well-known agent-based models, one plate each: a description, a diagram, the equations, a simulation to run, the original paper. For comparison when simulation is extended later. Not a model the work follows (the artist, 2026-11-24).",
    ),
  },
];
