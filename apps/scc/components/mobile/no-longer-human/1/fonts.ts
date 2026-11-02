import localFont from "next/font/local";

// Nanum Myeongjo, KS X 1001 subset copied from suneung/paper (OFL in ./fonts).
export const myeongjo = localFont({
  src: [
    { path: "./fonts/myeongjo-400.woff2", weight: "400" },
    { path: "./fonts/myeongjo-700.woff2", weight: "700" },
  ],
  display: "block",
  preload: false,
  variable: "--book-myeongjo",
});
