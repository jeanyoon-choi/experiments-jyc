// Every catalogue group (types.ts), in the panels' order. Each group's module is its own; add one here to show it.
// Removed (user, 2026-11-05; docs/screen/bubble/9.md): AI 아키텍처 and 공학·수학 기호 (flat line diagrams with no volume),
// 카지노·주화, 하드웨어·인프라, 인프라·하부구조 and 달러·센트 (a real bill and cent as relief: read as neither; code removed).
// Added (user, 2026-11-11/12): 금붕어의 천적 (foes.ts) and AI 슬롭 (slop.ts), after the others so their order and
// their bits in the pages' mask are unchanged.

import ai from "./ai.ts";
import apps from "./apps.ts";
import foes from "./foes.ts";
import slop from "./slop.ts";
import tickers from "./tickers.ts";
import ui from "./ui.ts";
import type { CatalogueGroup } from "./types.ts";

export const CATALOGUE: readonly CatalogueGroup[] = [ui, apps, ai, tickers, foes, slop];
