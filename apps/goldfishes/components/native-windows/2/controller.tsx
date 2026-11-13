'use client';

import { useMemo, useState } from 'react';
import { apps, appNames, defaults, ranges, createPlan, type Settings, type App } from './settings';
import { clampSetting, toggle } from '../shared/settings';
import { displaySize, useDesktopControl, type DesktopStatus } from '../shared/controller/use-desktop-control';
import { CheckboxGroup, ControllerShell, NumberFields, RunActions, RunReport, styles } from '../shared/controller/controls';

const controls = [['interval', '주의 전환 간격', '초'], ['steps', '주의 전환 횟수', '회'], ['countdown', '시작 전 대기', '초'], ['windowCount', '브라우저 창 상한', '개'], ['birth', '새 창 발생 확률', '%'], ['jitter', '몰아침·불규칙성', '%'], ['movement', '이동 진폭', '%'], ['period', '이동 주기', '초'], ['size', '기준 창 크기', '%'], ['spread', '크기·비율 차이', '%'], ['breath', '크기 맥동', '%']] as const;
const initial = (): Settings => ({ ...defaults, apps: [...defaults.apps] });

export default function DesktopController() {
  const [draft, setDraft] = useState<Settings>(initial);
  const { status, busy, error, act } = useDesktopControl<DesktopStatus<Settings, App>>('/api/desktop/0915/2');
  const plan = useMemo(() => draft.apps.length ? createPlan(draft) : [], [draft]);
  const duration = plan.slice(0, -1).reduce((total, step) => total + step.intervalMs, 0) / 1000;
  const set = (key: keyof Settings, value: number) => setDraft(current => ({ ...current, [key]: value }));
  const seed = (value: string) => { const n = clampSetting(ranges.seed, 'seed', value); if (n !== undefined) set('seed', n); };

  return <ControllerShell
    back={{ href: '/desktop/0915', label: '← Desktop / 0915' }}
    label="2 · moving windows"
    stickyRun
    settings={<>
      <h1>Moving windows</h1><p className={styles.intro}>창이 생기고, 가리고, 흘러갑니다. 실행 중 수정한 값은 다음 실행에 적용됩니다.</p>
      <CheckboxGroup legend="열어둘 앱" items={apps} names={appNames} selected={draft.apps} onToggle={app => setDraft(current => ({ ...current, apps: toggle(apps, current.apps, app) }))} />
      <NumberFields controls={controls} ranges={ranges} values={draft} onChange={set} />
      <p className={styles.hint}>이동·크기 변화는 이번 실행에서 만든 Chrome·Terminal 창에 적용됩니다. Preview·Slack은 전면 전환합니다.</p>
      <div className={styles.order}><label>전환 순서<select value={draft.order} onChange={e => setDraft(current => ({ ...current, order: e.target.value as Settings['order'] }))}><option value="cycle">차례대로</option><option value="random">무작위 · 연속 중복 없음</option></select></label><label>패턴 번호<input type="number" min="1" max="999999" value={draft.seed} onChange={e => seed(e.target.value)} /></label></div>
      <p className={styles.hint}>같은 설정과 패턴 번호는 같은 순서를 만듭니다.</p>
    </>}
    run={<>
      <h2>다음 실행</h2><div className={styles.summary}><strong>{draft.windowCount}<small>창까지</small></strong><span>{draft.interval.toFixed(1)}초 기준 · {draft.steps}회<br />기본 순서 {duration.toFixed(1)}초 · 몰아침에 따라 변동</span></div>
      <ol className={styles.sequence} aria-label="첫 8회 전환 계획">{plan.slice(0, 8).map(step => <li key={step.id}><span>{appNames[step.app]}{step.app === 'chrome' && step.birth ? ' ↗' : ''}</span><span>{(step.intervalMs / 1000).toFixed(2)}초 기준</span></li>)}</ol>
      <RunActions busy={busy} running={status.running} enabled={status.enabled} canStart={!!draft.apps.length} message={error || status.message} onAct={action => void act(action, { ...draft, apps: [...draft.apps], ...displaySize() })} onReset={() => setDraft(initial())} />
      <RunReport status={status} appNames={appNames} />
    </>}
  />;
}
