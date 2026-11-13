'use client';

import type { ReactNode } from 'react';
import { clampSetting, type Range } from '../settings';
import type { DesktopStatus } from './use-desktop-control';
import styles from './controller.module.css';

export { styles };

/** Page frame: back link, settings column and run column. */
export function ControllerShell({ back, label, stickyRun = false, settings, run }: { back: { href: string; label: string }; label: string; stickyRun?: boolean; settings: ReactNode; run: ReactNode }) {
  return <main className={styles.page}>
    <header className={styles.header}><a href={back.href}>{back.label}</a><span>{label}</span></header>
    <div className={styles.layout}>
      <section className={styles.settings} aria-label="다음 실행 설정">{settings}</section>
      <section className={stickyRun ? `${styles.run} ${styles.stickyRun}` : styles.run} aria-label="실행">{run}</section>
    </div>
  </main>;
}

export function CheckboxGroup<T extends string>({ legend, items, names, selected, onToggle, locked }: { legend: string; items: readonly T[]; names: Record<T, string>; selected: readonly T[]; onToggle: (item: T) => void; locked?: T }) {
  return <fieldset className={styles.apps}><legend>{legend}</legend>{items.map(item => <label key={item}><input type="checkbox" disabled={item === locked} checked={selected.includes(item)} onChange={() => onToggle(item)} />{names[item]}</label>)}</fieldset>;
}

/** A number input and a slider per control, both clamped to the control's range. */
export function NumberFields<K extends string>({ controls, ranges, values, onChange }: { controls: readonly (readonly [K, string, string])[]; ranges: Record<K, Range>; values: Record<K, number>; onChange: (key: K, value: number) => void }) {
  const update = (key: K, raw: string) => {
    const value = clampSetting(ranges[key], key, raw);
    if (value !== undefined) onChange(key, value);
  };
  return <div className={styles.fields}>{controls.map(([key, label, unit]) => <div className={styles.field} key={key}>
    <label htmlFor={`number-${key}`}>{label}</label><div className={styles.value}><input id={`number-${key}`} type="number" min={ranges[key][0]} max={ranges[key][1]} step={ranges[key][2]} value={values[key]} onChange={e => update(key, e.target.value)} /><span>{unit}</span></div>
    <input aria-label={`${label} 슬라이더`} type="range" min={ranges[key][0]} max={ranges[key][1]} step={ranges[key][2]} value={values[key]} onChange={e => update(key, e.target.value)} />
  </div>)}</div>;
}

/** Start/stop, reset and the live status line. */
export function RunActions({ busy, running, enabled, canStart, message, onAct, onReset }: { busy: boolean; running: boolean; enabled: boolean; canStart: boolean; message: string; onAct: (action: 'start' | 'stop') => void; onReset: () => void }) {
  return <>
    <button className={styles.start} disabled={busy || !enabled || (!running && !canStart)} onClick={() => onAct(running ? 'stop' : 'start')}>{running ? '중단 ■' : '이 설정으로 실행 ↗'}</button>
    <button className={styles.reset} disabled={busy} onClick={onReset}>설정 초기화</button>
    <p role="status" aria-live="polite" className={styles.status}>{message}</p>
  </>;
}

type AppliedSettings<App extends string> = { interval: number; steps: number; order: 'cycle' | 'random'; seed: number; countdown: number; jitter: number; movement: number; size: number; apps: App[] };

/** Values frozen into the current or last run, then its progress and errors. */
export function RunReport<App extends string>({ status, appNames }: { status: DesktopStatus<AppliedSettings<App>, App>; appNames: Record<App, string> }) {
  const { settings } = status;
  return <>
    {settings && <div className={styles.applied}><h2>{status.running ? '현재 실행에 적용된 값' : '마지막 실행'}</h2><p>{settings.interval}초 · {settings.steps}회 · {settings.order === 'cycle' ? '차례대로' : '무작위'} · 패턴 {settings.seed}</p><p>대기 {settings.countdown}초 · 불규칙성 {settings.jitter}%<br />이동 {settings.movement}% · 크기 {settings.size}%</p><p>{settings.apps.map(app => appNames[app]).join(' · ')}</p><p>{status.progress} / {settings.steps}{status.lastAction ? ` · ${appNames[status.lastAction]}` : ''}</p>{status.elapsedMs !== undefined && <p>마지막 명령 처리 {status.elapsedMs}ms / 목표 간격 {status.targetMs}ms</p>}</div>}
    {!!status.errors?.length && <div className={styles.errors} role="alert">{status.errors.map(item => <p key={item.id}>{item.text}</p>)}</div>}
  </>;
}
