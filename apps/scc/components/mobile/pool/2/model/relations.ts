// Who pays whom among the sixteen balls. Ball order is pool/1's: 0 Trump, then the fifteen
// companies. `from` pays `to` (or, for a pledge, promises it). Only ties checked against a source
// that was opened are here; the source and date of every line are in docs/experiments/mobile/pool.md.

/** Equity, warrants; purchases and contracts; anything with the state at one end. */
export type Kind = "invest" | "buy" | "state";
/** `weight` 1–3 is the size of the tie; `label` is what the ledger writes after "payer → payee". */
export type Relation = { from: number; to: number; kind: Kind; weight: 1 | 2 | 3; label: string };

/** What each ball is called on the drawing: stock tickers, and the two that have none. */
export const CODES = ["TRUMP", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "NVDA", "AMD", "INTC", "MU", "IBM", "OPENAI", "PLTR", "CRM"];

const [TRUMP, AAPL, MSFT, GOOGL, AMZN, META, TSLA, AVGO, NVDA, AMD, INTC, MU, IBM, OPENAI, PLTR, CRM] = CODES.map((_, i) => i);

export const RELATIONS: Relation[] = [
  // The loops: a supplier or landlord puts money into its own customer.
  { from: NVDA, to: OPENAI, kind: "invest", weight: 3, label: "$30B 투자" },
  { from: OPENAI, to: NVDA, kind: "buy", weight: 3, label: "5GW 칩 구매" },
  { from: MSFT, to: OPENAI, kind: "invest", weight: 3, label: "지분 27%" },
  { from: OPENAI, to: MSFT, kind: "buy", weight: 3, label: "$250B Azure" },
  { from: AMZN, to: OPENAI, kind: "invest", weight: 3, label: "$50B 투자 ($15B 선납)" },
  { from: OPENAI, to: AMZN, kind: "buy", weight: 3, label: "$138B AWS" },
  { from: AMD, to: OPENAI, kind: "invest", weight: 2, label: "신주인수권 1.6억 주" },
  { from: OPENAI, to: AMD, kind: "buy", weight: 2, label: "6GW 칩 구매" },
  { from: AMD, to: META, kind: "invest", weight: 2, label: "신주인수권 1.6억 주" },
  { from: META, to: AMD, kind: "buy", weight: 3, label: "최대 $100B 칩 구매" },
  { from: GOOGL, to: AAPL, kind: "buy", weight: 2, label: "연 $20B 기본 검색" },
  { from: AAPL, to: GOOGL, kind: "buy", weight: 1, label: "Siri에 Gemini" },
  // One way.
  { from: OPENAI, to: AVGO, kind: "buy", weight: 2, label: "10GW 맞춤 칩" },
  { from: NVDA, to: INTC, kind: "invest", weight: 2, label: "$5B · 지분 4.4%" },
  { from: NVDA, to: TSLA, kind: "invest", weight: 1, label: "xAI 시리즈 E 투자" },
  { from: META, to: GOOGL, kind: "buy", weight: 2, label: "$10B+ 클라우드" },
  { from: CRM, to: GOOGL, kind: "buy", weight: 1, label: "$2.5B 클라우드" },
  // The state: what it holds, pays and takes, and what it is given and promised.
  { from: TRUMP, to: INTC, kind: "state", weight: 2, label: "$8.9B · 정부 지분 9.9%" },
  { from: TRUMP, to: MU, kind: "state", weight: 2, label: "$6.44B 반도체법 보조금" },
  { from: TRUMP, to: PLTR, kind: "state", weight: 2, label: "육군 계약 최대 $10B" },
  { from: TRUMP, to: OPENAI, kind: "state", weight: 1, label: "국방부 계약 $200M" },
  { from: NVDA, to: TRUMP, kind: "state", weight: 2, label: "중국 판매 25% 납부" },
  { from: TSLA, to: TRUMP, kind: "state", weight: 3, label: "대선 자금 $277M" },
  { from: OPENAI, to: TRUMP, kind: "state", weight: 3, label: "스타게이트 $500B 약속" },
  { from: AAPL, to: TRUMP, kind: "state", weight: 3, label: "$600B 미국 투자 약속" },
  { from: META, to: TRUMP, kind: "state", weight: 3, label: "$600B 미국 투자 약속" },
  { from: MU, to: TRUMP, kind: "state", weight: 2, label: "$200B 미국 투자 약속" },
  { from: IBM, to: TRUMP, kind: "state", weight: 2, label: "$150B 미국 투자 약속" },
  { from: GOOGL, to: TRUMP, kind: "state", weight: 1, label: "취임식 $1M · 연회장 $22M" },
  { from: AMZN, to: TRUMP, kind: "state", weight: 1, label: "취임식 $1M · 연회장 기부" },
  { from: PLTR, to: TRUMP, kind: "state", weight: 1, label: "취임식 $1M · 연회장 기부" },
  { from: MSFT, to: TRUMP, kind: "state", weight: 1, label: "취임식 · 연회장 기부" },
];
