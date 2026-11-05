// Every catalogue group (types.ts), in the panels' order. Each group's module is its own; add one here to show it.
// Removed (user, 2026-11-05; docs/screen/bubble/9.md): AI 아키텍처 and 공학·수학 기호 (flat line diagrams with no volume),
// 카지노·주화 (replaced by 달러·센트), 하드웨어·인프라 and 인프라·하부구조 (their code removed too).

import ai from "./ai.ts";
import apps from "./apps.ts";
import money from "./money.ts";
import tickers from "./tickers.ts";
import ui from "./ui.ts";
import type { CatalogueGroup } from "./types.ts";

export const CATALOGUE: readonly CatalogueGroup[] = [ui, apps, ai, tickers, money];
