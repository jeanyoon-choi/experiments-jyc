// Who pays whom among the sixteen balls. Ball order is pool/1's: 0 Trump, then the fifteen
// companies. `from` pays `to`. Sources and dates for every line are in docs/experiments/mobile/pool.md.

export type Kind = "invest" | "buy" | "state";
/** `weight` 1–3 is the size of the tie; `label` is what the ledger writes after "payer → payee". */
export type Relation = { from: number; to: number; kind: Kind; weight: 1 | 2 | 3; label: string };

/** What each ball is called on the drawing: stock tickers, and the two that have none. */
export const CODES = ["TRUMP", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "NVDA", "AMD", "INTC", "MU", "IBM", "OPENAI", "PLTR", "CRM"];

const [TRUMP, AAPL, MSFT, GOOGL, AMZN, META, TSLA, AVGO, NVDA, AMD, INTC, MU, IBM, OPENAI, PLTR, CRM] = CODES.map((_, i) => i);

export const RELATIONS: Relation[] = [
  { from: NVDA, to: OPENAI, kind: "invest", weight: 3, label: "최대 $100B 투자" },
  { from: OPENAI, to: NVDA, kind: "buy", weight: 3, label: "10GW 칩 구매" },
  { from: MSFT, to: OPENAI, kind: "invest", weight: 3, label: "$13B 투자 · 지분 27%" },
  { from: OPENAI, to: MSFT, kind: "buy", weight: 3, label: "$250B Azure" },
  { from: AMD, to: OPENAI, kind: "invest", weight: 2, label: "신주인수권 1.6억 주" },
  { from: OPENAI, to: AMD, kind: "buy", weight: 2, label: "6GW 칩 구매" },
  { from: OPENAI, to: AVGO, kind: "buy", weight: 2, label: "10GW 맞춤 칩" },
  { from: OPENAI, to: AMZN, kind: "buy", weight: 2, label: "$38B AWS" },
  { from: NVDA, to: INTC, kind: "invest", weight: 2, label: "$5B 지분" },
  { from: TRUMP, to: INTC, kind: "state", weight: 2, label: "정부 지분 10%" },
  { from: NVDA, to: TRUMP, kind: "state", weight: 2, label: "중국 매출 15% 납부" },
  { from: AMD, to: TRUMP, kind: "state", weight: 2, label: "중국 매출 15% 납부" },
  { from: MSFT, to: NVDA, kind: "buy", weight: 3, label: "GPU 구매" },
  { from: META, to: NVDA, kind: "buy", weight: 3, label: "GPU 구매" },
  { from: AMZN, to: NVDA, kind: "buy", weight: 3, label: "GPU 구매" },
  { from: GOOGL, to: NVDA, kind: "buy", weight: 3, label: "GPU 구매" },
  { from: TSLA, to: NVDA, kind: "buy", weight: 2, label: "GPU 구매" },
  { from: META, to: GOOGL, kind: "buy", weight: 2, label: "$10B 클라우드" },
  { from: GOOGL, to: AAPL, kind: "buy", weight: 2, label: "연 $20B 기본 검색" },
  { from: AAPL, to: AVGO, kind: "buy", weight: 1, label: "칩 공급" },
  { from: NVDA, to: MU, kind: "buy", weight: 2, label: "HBM 구매" },
  { from: TRUMP, to: MU, kind: "state", weight: 1, label: "반도체법 보조금" },
  { from: TSLA, to: TRUMP, kind: "state", weight: 3, label: "대선 자금" },
  { from: TRUMP, to: PLTR, kind: "state", weight: 2, label: "육군 최대 $10B 계약" },
  { from: CRM, to: GOOGL, kind: "buy", weight: 1, label: "클라우드" },
  { from: TRUMP, to: OPENAI, kind: "state", weight: 2, label: "스타게이트 발표" },
];
void [IBM];
