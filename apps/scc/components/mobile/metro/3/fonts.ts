import localFont from "next/font/local";

// 서울알림체 (서울특별시, 2024), the typeface of the 서울 지하철 노선도, subset
// to the names on this map (every station name, English name and badge here
// is covered). 공공누리 제1유형: free use with the source credited —
// 출처: 서울특별시 서울서체 (https://www.seoul.go.kr/seoul/font.do).
export const alrim = localFont({
  src: [
    { path: "./fonts/alrim-500.woff2", weight: "500" },
    { path: "./fonts/alrim-700.woff2", weight: "700" },
    { path: "./fonts/alrim-800.woff2", weight: "800" },
  ],
  display: "block",
  preload: true,
  fallback: ["Apple SD Gothic Neo", "Noto Sans KR", "sans-serif"],
});
