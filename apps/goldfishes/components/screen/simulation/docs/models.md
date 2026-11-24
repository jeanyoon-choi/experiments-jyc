# 에이전트 모델 도감 (reference)

- Route: `/screen/simulation/reference/agent-models` (registered, so the navigation lists it; `components/screen/simulation/reference/agent-models/` sends it on to the page)
- Page: `/screen/simulation/reference/agent-models.html`
- File: `public/screen/simulation/reference/agent-models.html` (one self-contained page; it is in `public/` because it is served as it is, not built)
- Added: 2026-11-24, from a page another agent made for the artist
- In the [system map](../../../../docs/system.md): `foundations/system/model/references.ts`, shown beside [1] G-B Dynamics

A specimen book of 24 well-known agent-based models, one plate each: what it is, a diagram, the equations, a small simulation to run, the original paper. For the artist and for agents to look at when `simulation` is extended.

**Not a specification (user, 2026-11-24: "이걸 따라하지는 않겠지만").** Nothing here is a rule Goldfishes follows. [Direction](../../../../docs/direction.md#principles-the-artists-from-those-corrections) still holds: one objective for each agent, nothing bolted on, no idea brought in from outside the artist's notes. Use a plate to compare a behaviour or to name a mechanism already found (the voter model, the forest fire); ask the artist before taking a rule from one.

| | Plates |
|---|---|
| A 개체군 동역학 | 포식-피식, 경쟁 Lotka–Volterra, 가위바위보 |
| B 유인과 제도 | 주인-대리인, 공유지의 비극 |
| C 전파와 확산 | 전염과 소문, 문턱과 캐스케이드, Granovetter, Bass, 제한된 주의 속의 밈 경쟁, Pólya 항아리 |
| D 의견과 문화 | 투표자, 제한된 신뢰, Axelrod, Schelling |
| E 자기조직 임계와 경쟁 | 산불, 모래더미, 소수자 게임, 가속하는 집단 주의 |
| F–H | 다중 에이전트 강화학습, LLM 에이전트 시뮬레이션, 상도표, 조기 경보 신호, ODD |

## Changed from the page as it came

- The export wrapper's head replaced with a plain one (title, language).
- Backgrounds made pure: the benches' panel `#f6f6f4` → `#fff`; in dark the page `#0e0e0e` and the panel `#161616` → `#000`.
- It takes white or black from `/system`'s choice (the same key in the browser), else from the system.
- One line under the title says what it is for, with links to `/system` and `simulation/0`.
- Nothing else: the models, their text, their simulations and their sources are as the other agent wrote them.

## Not checked

- The content: no plate's equations, figures or citations were checked against its source.
- It loads fonts (Google Fonts) and MathJax (cdnjs) from the network; offline it falls back to system fonts and shows the equations as raw TeX.
