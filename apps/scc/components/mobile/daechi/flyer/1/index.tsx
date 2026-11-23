"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { averageOf, placeOf } from "./admissions";
import { CATALOG, itemAt, man, TEASERS, WHOLE, won } from "./catalog";
import { COUNSELS, EVERY, TIERS } from "./counsel";
import { cellOf, COLUMNS, drawReport, type Report } from "./report";
import { Instrument } from "./tools";
import styles from "./screen.module.css";

// Everything is bought whole. One sitting is three tenths of a 등급 (`STEP`
// tenths), three points of 표준점수 in 국어 and 수학, while the count and the
// fee run. A press buys one at once, and a held finger buys another every
// `SLOW` seconds, each wait `QUICKEN` of the last down to `FAST`. A release
// stops it at once.
const STEP = 3;
const SLOW = 0.25;
const FAST = 0.1;
const QUICKEN = 0.94;
const INSTRUMENTS = 3;
// The next 수능, 2028학년도: 러셀 counted D-360 on 2026-11-23, which is 2027-11-18.
const EXAM = Date.UTC(2027, 10, 18);

/** A held finger: the place on the report it presses, and where it is on the theatre. */
type Press = { target: number; left: number; top: number };

/** 등급 gained at each place (the seven columns, then `WHOLE`), and the places pressed now. */
type Bill = { gains: number[]; pressed: number[] };

/** The consulting pop-up on screen: which one, how many have come up, and the tier its button now sells. */
type Offer = { counsel: number; shown: number; tier: number };

const EMPTY_BILL: Bill = { gains: Array.from({ length: WHOLE + 1 }, () => 0), pressed: [] };

/** Where every column stands: its own gain and the whole report's. */
const gradesOf = (report: Report, gains: readonly number[]) =>
  report.grades.map((grade, column) => (grade * 10 - STEP * (gains[column] + gains[WHOLE])) / 10);

// Days to the exam in Korea, whatever the clock of the mobile.
function daysLeft() {
  const today = new Date(Date.now() + 9 * 3_600_000);
  return Math.round((EXAM - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) / 86_400_000);
}

function Sheet({ report, grades, held }: { report: Report; grades: readonly number[]; held?: ReadonlySet<number> }) {
  const cells = COLUMNS.map((column, index) => cellOf(column, grades[index]));
  const first = COLUMNS.map((column, index) => cellOf(column, report.grades[index]));
  const on = (column: number) => (held?.has(column) || held?.has(WHOLE) ? styles.held : "");
  const row = (label: string, pick: "standard" | "percentile" | "grade") => (
    <>
      <span className={styles.label}>{label}</span>
      {COLUMNS.map((column, index) => (
        <span
          key={column.key}
          data-target={index}
          className={`${pick === "grade" ? styles.grade : ""} ${cells[index][pick] ? "" : styles.none} ${cells[index][pick] === first[index][pick] ? "" : styles.raised} ${on(index)}`}
        >
          {cells[index][pick]}
        </span>
      ))}
    </>
  );
  return (
    <div className={styles.sheet}>
      <p className={styles.title}>2027학년도 대학수학능력시험 성적통지표</p>
      <div className={`${styles.person} ${held?.has(WHOLE) ? styles.held : ""}`} data-target={WHOLE}>
        <span className={styles.label}>수험번호</span>
        <span className={styles.label}>성 명</span>
        <span className={styles.label}>생년월일</span>
        <span className={styles.label}>성 별</span>
        <span className={styles.label}>출신고교 (반 또는 졸업년도)</span>
        <span>{report.number}</span>
        <span>홍길동</span>
        <span>08.03.02.</span>
        <span>남</span>
        <span>한국고등학교 (9)</span>
      </div>
      <div className={styles.table}>
        <span className={styles.label}>영 역</span>
        {COLUMNS.map((column, index) => {
          // 탐구 heads both of its subjects; the half pressed is the subject under it.
          if (COLUMNS[index - 1]?.area === column.area) return null;
          const span = COLUMNS[index + 1]?.area === column.area ? 2 : 1;
          return (
            <span
              key={column.key}
              data-target={index}
              data-pair={span === 2 ? index + 1 : undefined}
              className={`${styles.label} ${span === 2 ? (held?.has(WHOLE) ? styles.held : "") : on(index)}`}
              style={span === 2 ? { gridColumn: "span 2" } : undefined}
            >
              {column.area.replace("/", "/\u200b")}
            </span>
          );
        })}
        <span className={styles.label}>선택과목</span>
        {COLUMNS.map((column, index) => (
          <span key={column.key} data-target={index} className={`${column.subject ? styles.subject : styles.none} ${on(index)}`}>{column.subject}</span>
        ))}
        {row("표준점수", "standard")}
        {row("백분위", "percentile")}
        {row("등 급", "grade")}
      </div>
      <p className={styles.issuer}>2026. 12. 11.<strong>한국교육과정평가원장</strong><i>한국교육과정평가원장인</i></p>
    </div>
  );
}

export default function DaechiFlyerOne() {
  const theatreRef = useRef<HTMLElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const instrumentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pressesRef = useRef(new Map<number, Press>());
  const gainsRef = useRef(new Float32Array(WHOLE + 1));
  // Seconds until each held place buys again, and the wait it is now on.
  const dueRef = useRef(new Float32Array(WHOLE + 1));
  const waitRef = useRef(new Float32Array(WHOLE + 1));
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  // Drawn after mount: the server cannot know which report this visit gets.
  const [report, setReport] = useState<Report | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [bill, setBill] = useState<Bill>(EMPTY_BILL);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [booked, setBooked] = useState({ count: 0, cost: 0 });
  // Pop-ups come up in order; "오늘 하루 보지 않음" ends them for the visit.
  const shownRef = useRef(0);
  const mutedRef = useRef(false);

  useEffect(() => {
    setReport(drawReport());
    setDays(daysLeft());
  }, []);

  // Each held finger carries what it is cheating with, tip on the pressed point.
  const placeInstruments = useCallback(() => {
    const presses = [...pressesRef.current.values()];
    instrumentRefs.current.forEach((node, index) => {
      if (!node) return;
      const press = presses[index];
      node.style.display = press ? "block" : "none";
      if (press) node.style.transform = `translate(${press.left}px, ${press.top}px)`;
    });
  }, []);

  const writeBill = useCallback(() => {
    setBill({ gains: Array.from(gainsRef.current), pressed: [...pressesRef.current.values()].map((press) => press.target) });
  }, []);

  const tick = useCallback(function step(now: number) {
    frameRef.current = null;
    const elapsed = Math.min(0.05, Math.max(0, (now - lastRef.current) / 1000));
    lastRef.current = now;
    const held = new Set<number>();
    for (const press of pressesRef.current.values()) held.add(press.target);
    for (const target of held) {
      dueRef.current[target] -= elapsed;
      while (dueRef.current[target] <= 0) {
        gainsRef.current[target] += 1;
        waitRef.current[target] = Math.max(FAST, waitRef.current[target] * QUICKEN);
        dueRef.current[target] += waitRef.current[target];
      }
    }
    // Every `EVERY` 등급 bought, the academy interrupts with the next
    // consultation; the pop-up takes the fingers off the report.
    const bought = gainsRef.current.reduce((sum, gain) => sum + gain, 0);
    if (!mutedRef.current && bought >= (shownRef.current + 1) * EVERY) {
      setOffer({ counsel: shownRef.current % COUNSELS.length, shown: shownRef.current + 1, tier: 0 });
      shownRef.current += 1;
      pressesRef.current.clear();
    }
    placeInstruments();
    writeBill();
    if (pressesRef.current.size > 0) frameRef.current = requestAnimationFrame(step);
  }, [placeInstruments, writeBill]);

  const locate = (event: React.PointerEvent<HTMLElement>) => {
    const bounds = theatreRef.current!.getBoundingClientRect();
    return { left: event.clientX - bounds.left, top: event.clientY - bounds.top };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const cell = (event.target as Element).closest<HTMLElement>("[data-target]");
    if (!cell) return;
    let target = Number(cell.dataset.target);
    if (cell.dataset.pair) {
      const bounds = cell.getBoundingClientRect();
      if (event.clientX > bounds.left + bounds.width / 2) target = Number(cell.dataset.pair);
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    // The touch itself buys one, unless another finger already holds the place.
    if (![...pressesRef.current.values()].some((other) => other.target === target)) {
      gainsRef.current[target] += 1;
      waitRef.current[target] = SLOW;
      dueRef.current[target] = SLOW;
    }
    pressesRef.current.set(event.pointerId, { target, ...locate(event) });
    writeBill();
    if (frameRef.current === null) {
      lastRef.current = performance.now();
      frameRef.current = requestAnimationFrame(tick);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const press = pressesRef.current.get(event.pointerId);
    if (press) Object.assign(press, locate(event));
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const press = pressesRef.current.get(event.pointerId);
    if (!press) return;
    pressesRef.current.delete(event.pointerId);
    placeInstruments();
    writeBill();
  };

  useEffect(() => {
    const presses = pressesRef.current;
    const onVisibility = () => { if (document.hidden) presses.clear(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      presses.clear();
    };
  }, []);

  // A finger held on the report must not bring up iOS's magnifier or text
  // selection: the touch is cancelled where it starts, which leaves the
  // pointer events that drive the press. The pop-up's buttons are outside it.
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    const block = (event: TouchEvent) => { if (event.cancelable) event.preventDefault(); };
    paper.addEventListener("touchstart", block, { passive: false });
    return () => paper.removeEventListener("touchstart", block);
  }, [report]);

  // The flyer is a fixed sheet: no pinch or double-tap zoom, no page scroll
  // or rubber band under it, for as long as it is on screen.
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const kept = [root.style.overflow, root.style.overscrollBehavior, body.style.overflow, body.style.overscrollBehavior];
    root.style.overflow = body.style.overflow = "hidden";
    root.style.overscrollBehavior = body.style.overscrollBehavior = "none";
    const block = (event: Event) => event.preventDefault();
    const onTouchMove = (event: TouchEvent) => { if (event.cancelable) event.preventDefault(); };
    const onWheel = (event: WheelEvent) => { if (event.ctrlKey) event.preventDefault(); };
    const options = { passive: false } as const;
    // Safari's own pinch events; elsewhere `touch-action: none` on the stage.
    document.addEventListener("gesturestart", block, options);
    document.addEventListener("gesturechange", block, options);
    document.addEventListener("touchmove", onTouchMove, options);
    document.addEventListener("dblclick", block);
    window.addEventListener("wheel", onWheel, options);
    return () => {
      [root.style.overflow, root.style.overscrollBehavior, body.style.overflow, body.style.overscrollBehavior] = kept;
      document.removeEventListener("gesturestart", block);
      document.removeEventListener("gesturechange", block);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("dblclick", block);
      window.removeEventListener("wheel", onWheel);
    };
  }, []);

  // A row is billed for every 등급 gained at any of the places it is sold.
  const counts = CATALOG.map((item) => item.targets.reduce((sum, target) => sum + bill.gains[target], 0));
  const total = counts.reduce((sum, count, index) => sum + count * CATALOG[index].price, booked.cost);
  const raised = counts.reduce((sum, count) => sum + count, 0);
  const using = bill.pressed.map(itemAt);
  // The banner congratulates wherever the report now gets in.
  const grades = report && gradesOf(report, bill.gains);
  const average = grades && averageOf(grades);
  const place = average === null ? null : placeOf(average);
  const now = using[0];
  const held = new Set(bill.pressed);
  return (
    <main className={styles.stage} onContextMenu={(event) => event.preventDefault()}>
      <div className={styles.board}>
        <header className={styles.head}>
          <p className={styles.where}>
            <span><i>수인분당</i>한티역</span>
            <span>{days === null ? "" : `2028 수능 D-${days}`}</span>
          </p>
          <h1 className={styles.academy}>AI딸깍<em>입시학원</em></h1>
          <p className={styles.slogan}>AI 잘 사용하는 것도 실력입니다</p>
          <p className={styles.offer}>
            {TEASERS.map((item, index) => (
              <span key={item.key}>{index > 0 && " · "}{item.label} <b>{man(item.price)}</b>만</span>
            ))}~
          </p>
          <p className={styles.banner} aria-live="off">
            {average !== null && (
              <>
                <small>국수탐 백분위 평균 {Math.round(average)}</small>
                {place ? `${place} 합격!` : "지원 가능 대학 표에 없음"}
              </>
            )}
          </p>
        </header>

        <section ref={theatreRef} className={styles.theatre}>
          {report && (
            <>
              <div
                ref={paperRef}
                className={styles.paper}
                role="img"
                aria-label="수능 성적통지표. 영역을 누르고 있는 동안 그 영역의 등급이 오르고, 성명을 누르고 있으면 모든 영역이 함께 오르며, 손가락을 떼면 멈춥니다"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onLostPointerCapture={onPointerEnd}
              >
                <Sheet report={report} grades={grades!} held={held} />
              </div>
            </>
          )}
          {Array.from({ length: INSTRUMENTS }, (_, index) => (
            <div key={index} ref={(node) => { instrumentRefs.current[index] = node; }} className={styles.hand}>
              <Instrument tool={CATALOG[using[index] ?? 0].tool} />
            </div>
          ))}
        </section>

        <footer className={styles.bill}>
          <p className={`${styles.now} ${now === undefined ? "" : styles.live}`} aria-live="off">
            {now === undefined ? (
              <strong>올리고 싶은 영역을 꾹 누르고 계세요</strong>
            ) : (
              <>
                <span>수강 중</span>
                <strong>{CATALOG[now].label}</strong>
                <span>1회 {won(CATALOG[now].price)}원 × {counts[now]}</span>
              </>
            )}
          </p>
          <ul className={styles.rows}>
            {CATALOG.map((item, index) => (
              <li key={item.key} className={counts[index] > 0 ? styles.done : ""}>
                <span>{item.label}</span>
                <span>×{counts[index]}</span>
                <span>{won(counts[index] * item.price)}</span>
              </li>
            ))}
            <li className={booked.count > 0 ? styles.done : ""}>
              <span>걸리지 않는 법 컨설팅</span>
              <span>×{booked.count}</span>
              <span>{won(booked.cost)}</span>
            </li>
          </ul>
          <p className={styles.total}>
            <span>총 수강료<small>수강 {raised}회</small></span>
            <strong>{won(total)}<small>원</small></strong>
          </p>
          <p className={styles.fine}>개인에 따라 결과가 다를 수 있습니다 · 적발 시 성적 무효</p>
        </footer>
        {offer && (
          <div className={styles.veil}>
            <section className={styles.popup} role="dialog" aria-modal="true" aria-labelledby="counsel-title">
              <p className={styles.count}>{offer.shown} / {COUNSELS.length}</p>
              <p className={styles.host}>AI딸깍입시학원</p>
              <p className={styles.pitch}>{COUNSELS[offer.counsel].pitch}</p>
              <h2 id="counsel-title">걸리지 않는 법<br />1:1 컨설팅</h2>
              <p className={styles.topic}>{COUNSELS[offer.counsel].topic}</p>
              <p className={styles.fact}>{COUNSELS[offer.counsel].fact}</p>
              {/* 신청하기 never closes the pop-up: it bills the tier and leads to the next 신청하기. */}
              <p className={styles.tier} aria-live="polite">
                {offer.tier > 0 && <span>{TIERS[offer.tier - 1].name} 신청 완료 · </span>}{TIERS[offer.tier].upsell}
              </p>
              <button
                type="button"
                className={styles.book}
                onClick={() => {
                  setBooked((kept) => ({ count: kept.count + 1, cost: kept.cost + TIERS[offer.tier].price }));
                  setOffer({ ...offer, tier: Math.min(offer.tier + 1, TIERS.length - 1) });
                }}
              >
                {TIERS[offer.tier].name} {TIERS[offer.tier].unit} {man(TIERS[offer.tier].price)}만원 · 신청하기 ›
              </button>
              <p className={styles.dismiss}>
                <button type="button" onClick={() => { mutedRef.current = true; setOffer(null); }}>오늘 하루 보지 않음</button>
                <button type="button" onClick={() => setOffer(null)}>닫기 ✕</button>
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
