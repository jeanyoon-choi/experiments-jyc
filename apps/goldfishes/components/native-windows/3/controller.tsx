'use client';

import { useMemo, useState } from 'react';
import { apps, appNames, defaults, ranges, createPlan, type Settings, type App } from './settings';
import { categories, type Category } from './catalog';
import { clampSetting, toggle } from '../shared/settings';
import { displaySize, useDesktopControl, type DesktopStatus } from '../shared/controller/use-desktop-control';
import { CheckboxGroup, ControllerShell, NumberFields, RunActions, RunReport, styles } from '../shared/controller/controls';

type Status = DesktopStatus<Settings, App> & { pageCount?: number; windowCount?: number; title?: string; kind?: string };
const categoryNames: Record<Category, string> = { companies: '기업·플랫폼', startups: '서비스', 'multilingual-wiki': '다국어 위키', news: '뉴스', 'google-search': 'Google 검색' };
const kindNames: Record<string, string> = { revisit: '· 재방문', tab: '· 새 탭', window: '· 새 창' };
const controls = [['interval', '동작 간격', '초'], ['steps', '동작 횟수', '회'], ['revisit', '기존 탭 재방문 비율', '%'], ['countdown', '시작 전 대기', '초'], ['pageLimit', '남겨둘 페이지 상한', '개'], ['windowCount', '창 상한', '개'], ['birth', '새 창 비율 · 나머지는 새 탭', '%'], ['scroll', '스크롤 확률', '%'], ['slack', 'Slack 끼어들기 확률', '%'], ['jitter', '몰아침·불규칙성', '%'], ['movingWindows', '최근 이동할 창', '개'], ['movement', '이동 진폭', '%'], ['period', '이동 주기', '초'], ['size', '기준 창 크기', '%'], ['spread', '크기·비율 차이', '%'], ['breath', '크기 맥동', '%']] as const;
const initial = (): Settings => ({ ...defaults, apps: [...defaults.apps] });

export default function DesktopController() {
  const [draft, setDraft] = useState<Settings>(initial);
  const { status, busy, error, act } = useDesktopControl<Status>('/api/desktop/0915/3');
  const plan = useMemo(() => draft.categories.length ? createPlan(draft) : [], [draft]);
  const duration = plan.slice(0, -1).reduce((total, step) => total + step.intervalMs, 0) / 1000;
  const set = (key: keyof Settings, value: number) => setDraft(current => ({ ...current, [key]: value }));
  const seed = (value: string) => { const n = clampSetting(ranges.seed, 'seed', value); if (n !== undefined) set('seed', n); };

  return <ControllerShell
    back={{ href: '/desktop/0915', label: '← Desktop / 0915' }}
    label="3 · return and interrupt"
    stickyRun
    settings={<>
      <h1>Return and interrupt</h1><p className={styles.intro}>새 창·새 탭을 열다가, 이전에 열린 탭을 무작위로 다시 봅니다. 오래된 것은 닫히고 최근의 창들이 흘러갑니다. 터미널도 매 동작 10% 확률로 열거나 전면에 가져옵니다. 수정한 값은 실행을 누를 때 적용됩니다.</p>
      <CheckboxGroup legend="브라우저 + 끼어들기" items={apps} names={appNames} selected={draft.apps} locked="chrome" onToggle={app => setDraft(current => ({ ...current, apps: toggle(apps, current.apps, app) }))} />
      <CheckboxGroup legend="새 페이지의 종류" items={categories} names={categoryNames} selected={draft.categories} onToggle={category => setDraft(current => ({ ...current, categories: toggle(categories, current.categories, category) }))} />
      <NumberFields controls={controls} ranges={ranges} values={draft} onChange={set} />
      <p className={styles.hint}>탭+창의 페이지 수를 합산합니다. 이 서버 세션의 3버전이 만든 탭만 오래된 순서로 닫습니다. 50개는 안전 보장이 아닌 최대 설정값입니다. 부하가 커지면 간격을 늘리고 이동을 생략합니다.</p>
      <div className={styles.order}><label>패턴 번호<input type="number" min="1" max="999999" value={draft.seed} onChange={e => seed(e.target.value)} /></label></div>
      <p className={styles.hint}>같은 설정은 같은 동작 계획을 만듭니다. 첫 3회는 생성하고, 재방문은 직전 탭을 제외합니다. 대상이 없으면 새 페이지를 엽니다.</p>
    </>}
    run={<>
      <h2>다음 실행</h2><div className={styles.summary}><strong>{draft.pageLimit}<small>페이지까지</small></strong><span>{draft.interval.toFixed(1)}초 기준 · {draft.steps}회<br />기본 순서 {duration.toFixed(1)}초 · 실제 부하에 따라 연장</span></div>
      <ol className={styles.sequence} aria-label="첫 8회 동작 계획">{plan.slice(0, 8).map(step => <li key={step.id}><span>{step.revisit ? '이전에 열린 탭' : step.page.title}</span><span>{step.revisit ? '재방문' : step.birth ? '새 창' : '새 탭'} · {(step.intervalMs / 1000).toFixed(2)}초</span></li>)}</ol>
      <RunActions busy={busy} running={status.running} enabled={status.enabled} canStart={!!draft.categories.length} message={error || status.message} onAct={action => void act(action, { ...draft, apps: [...draft.apps], categories: [...draft.categories], ...displaySize() })} onReset={() => setDraft(initial())} />
      {status.pageCount !== undefined && <p>{status.pageCount}페이지 · {status.windowCount}창<br />{status.title} {status.kind ? kindNames[status.kind] ?? '' : ''}</p>}
      <p className={styles.hint}>스크롤은 선택한 실험 탭이 전면일 때만 Page Up/Down으로 시도합니다. 로딩·접근성 권한에 따라 생략될 수 있습니다. 댓글 입력·공개 전송은 아직 포함하지 않았습니다.</p>
      <RunReport status={status} appNames={appNames} />
    </>}
  />;
}
