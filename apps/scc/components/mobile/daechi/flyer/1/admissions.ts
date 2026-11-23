// Where the report gets in. The ladder is 대치720's "2026학년도 정시 결과
// 백분위별 대학" (2026-03-16), its 인문계열 column, since the report's subjects
// are 확률과 통계 and 사회탐구: the universities one could apply to at each
// 국·수·탐 백분위 평균. The table itself notes it runs below 대학어디가's 70% cuts.
// Its top row, 98, lists 의예과 as the minimum; it has no row under 76.

import { cellOf, COLUMNS } from "./report";

const LADDER: readonly (readonly [number, string])[] = [
  [98, "의예과"],
  [97, "서울대 상경"],
  [96, "서울대"],
  [95, "고려대·연세대 상경"],
  [94, "고려대·연세대"],
  [93, "서강대 상경·성균관대"],
  [92, "서강대·한양대"],
  [90, "중앙대·경희대·시립대"],
  [87, "한국외대·건국대·동국대"],
  [85, "국민대·숭실대·세종대"],
  [82, "광운대·명지대"],
  [81, "상명대·가천대"],
  [79, "가톨릭대·경기대"],
  [76, "충북대·강원대"],
];

/** 국·수·탐 백분위 평균 as printed on the report: 국어, 수학 and the mean of the two 탐구. */
export function averageOf(grades: readonly number[]) {
  const percentile = (key: string) => {
    const index = COLUMNS.findIndex((column) => column.key === key);
    return Number(cellOf(COLUMNS[index], grades[index]).percentile);
  };
  return (percentile("korean") + percentile("math") + (percentile("inquiry-a") + percentile("inquiry-b")) / 2) / 3;
}

/** The universities the table lists at that average, or null under its last row. */
export const placeOf = (average: number) => LADDER.find(([floor]) => average >= floor)?.[1] ?? null;
