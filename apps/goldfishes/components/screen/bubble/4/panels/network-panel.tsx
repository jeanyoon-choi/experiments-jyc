import styles from "../bubble-three.module.css";
import { DAMPING_RANGE, FLOOR_RANGE, GROWTH_RANGE, MAX_GROUPS, MAX_PAGES, VOLATILITY_RANGE } from "../web/model";
import { MIN_PAGES } from "../settings";
import { VIEWS, type ViewId } from "../raft/views";
import { Chip, Chips, Note, Panel, Reset, Slider } from "./controls";

/** The web parameters this panel sets. */
export type Rates = { growth: number; volatility: number; floor: number };

const GROUP_COUNTS = Array.from({ length: MAX_GROUPS }, (_, index) => index + 1);

/** 순위 쏠림: the slider runs over the appeal floor on a log scale, high floor (even) at 0. */
function floorPosition(floor: number) {
  return 1 - Math.log(floor / FLOOR_RANGE[0]) / Math.log(FLOOR_RANGE[1] / FLOOR_RANGE[0]);
}

function floorAt(position: number) {
  return FLOOR_RANGE[0] * (FLOOR_RANGE[1] / FLOOR_RANGE[0]) ** (1 - position);
}

type Props = {
  view: ViewId;
  onView: (view: ViewId) => void;
  rates: Rates;
  onRates: (change: Partial<Rates>) => void;
  damping: number;
  onDamping: (damping: number) => void;
  population: number;
  onPopulation: (count: number) => void;
  groups: number;
  onGroups: (count: number) => void;
  diversity: number;
  onDiversity: (diversity: number) => void;
  onReshuffle: () => void;
};

export function NetworkPanel({ view, onView, rates, onRates, damping, onDamping, population, onPopulation, groups, onGroups, diversity, onDiversity, onReshuffle }: Props) {
  return (
    <Panel id="network" label="네트워크">
      <Note>크기가 곧 PageRank · 빈 곳을 누르면 새 페이지, 페이지에서 페이지로 끌면 링크</Note>
      <div className={styles.views} role="group" aria-label="보기">
        {VIEWS.map((option) => (
          <Chip key={option.id} pressed={view === option.id} onClick={() => onView(option.id)}>
            {option.label}
          </Chip>
        ))}
      </div>
      <Slider
        label="품질 요동"
        output={rates.volatility.toFixed(2)}
        ariaLabel="페이지 품질이 오르내리는 정도"
        min={VOLATILITY_RANGE[0]}
        max={VOLATILITY_RANGE[1]}
        step={0.05}
        value={rates.volatility}
        onChange={(volatility) => onRates({ volatility })}
      />
      <Slider
        label="순위 쏠림"
        ariaLabel="관심이 순위 높은 페이지로 쏠리는 정도"
        min={0}
        max={1}
        step={0.01}
        value={floorPosition(rates.floor)}
        onChange={(position) => onRates({ floor: floorAt(position) })}
      />
      <Slider
        label="새 페이지"
        output={`초당 ${rates.growth.toFixed(2)}`}
        ariaLabel="새 페이지가 생기는 속도"
        min={GROWTH_RANGE[0]}
        max={GROWTH_RANGE[1]}
        step={0.05}
        value={rates.growth}
        onChange={(growth) => onRates({ growth })}
      />
      <Slider
        label="링크를 따를 확률 d"
        output={damping.toFixed(2)}
        ariaLabel="링크를 따라갈 확률 d"
        min={DAMPING_RANGE[0]}
        max={DAMPING_RANGE[1]}
        step={0.01}
        value={damping}
        onChange={onDamping}
      />
      <Slider
        label="페이지 수"
        output={population}
        ariaLabel="페이지 수; 바꾸면 웹이 처음부터 다시 시작됩니다"
        min={MIN_PAGES}
        max={MAX_PAGES}
        step={10}
        value={population}
        onChange={onPopulation}
      />
      <Note>그룹 · 서로 링크되지 않는 버블 무리 (바꾸면 처음부터)</Note>
      <Chips label="서로 링크되지 않는 그룹 수">
        {GROUP_COUNTS.map((count) => (
          <Chip key={count} pressed={groups === count} onClick={() => onGroups(count)}>
            {count}
          </Chip>
        ))}
      </Chips>
      {groups > 1 && (
        <>
          <Slider
            label="그룹 다양성"
            output={diversity.toFixed(2)}
            ariaLabel="그룹마다 크기와 성격이 다른 정도; 바꾸면 처음부터"
            min={0}
            max={1}
            step={0.05}
            value={diversity}
            onChange={onDiversity}
          />
          <Reset onClick={onReshuffle}>다시 섞기</Reset>
        </>
      )}
    </Panel>
  );
}
