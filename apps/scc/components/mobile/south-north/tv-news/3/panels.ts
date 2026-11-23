// The parts of the screen, top to bottom. Each is one video holding a South
// and a North picture side by side (South left, North right; South's sound on
// the left channel, North's on the right), and a still of its first frame for
// while it is not the one playing. Only the anchors have a morph track; the
// others are two pictures cut to the same place and mixed.

export type Panel = {
  id: string;
  video: string;
  still: string;
  /** Folder of track.json / track.bin, when the pair has measured points. */
  track?: string;
  label: string;
  /** What the information button names for this part: South, then North. */
  sources: [south: string, north: string];
};

const ONE = "/video/south-north/tv-news/1";
const THREE = "/video/south-north/tv-news/3";

export const PANELS: Panel[] = [
  {
    id: "anchor",
    video: `${ONE}/news.mp4`,
    still: `${THREE}/anchor.jpg`,
    track: ONE,
    label: "MBC 뉴스데스크와 조선중앙텔레비죤 보도의 앵커가 한 화면에서 합쳐진다.",
    sources: ["MBC 뉴스데스크, 2026. 11. 12.", "조선중앙TV 보도, 2026. 10. 13."],
  },
  {
    id: "parade",
    video: `${THREE}/parade.mp4`,
    still: `${THREE}/parade.jpg`,
    label: "국군의 날 기념식의 분열과 조선로동당 창건 80돐 열병식의 행진이 겹치고, 박수 치는 대통령과 경례하는 위원장이 같은 자리에 선다.",
    sources: ["제76주년 국군의 날 기념식, KBS, 2024. 10. 1.", "조선로동당 창건 80돐 열병식, 2025. 10."],
  },
  {
    id: "anthem",
    video: `${THREE}/anthem.mp4`,
    still: `${THREE}/anthem.jpg`,
    label: "대한민국정부 홍보영상의 남자와 《친근한 어버이》의 김정은이 화면 가운데에서 겹치고, 한반도 지도와 인공기로 끝난다.",
    sources: ["대한민국정부 「대한민국에 놀라운 ‘힘’이 깨어났다」", "《친근한 어버이》, 2024"],
  },
  {
    id: "stage",
    video: `${THREE}/stage.mp4`,
    still: `${THREE}/stage.jpg`,
    label: "아이브 장원영의 무대와 신년경축공연의 독창 가수가 한 무대에 겹쳐 선다.",
    sources: ["장원영(IVE) 직캠, 2025. 10. 31.", "2025년 신년경축공연"],
  },
  {
    id: "street",
    video: `${THREE}/street.mp4`,
    still: `${THREE}/street.jpg`,
    label: "강남의 낮 보도와 평양 림흥거리의 밤 보도를 같은 눈높이로 걷는다.",
    sources: ["강남 걷기, Seoul Walk", "평양 림흥거리 걷기, Dull Night Walk"],
  },
  {
    id: "towers",
    video: `${THREE}/towers.mp4`,
    still: `${THREE}/towers.jpg`,
    label: "래미안 광고의 밤 아파트와 화성지구 준공식 보도의 밤 살림집이 겹친다.",
    sources: ["래미안 「ONE&ONLY MASTERPIECE」", "화성지구 4단계 살림집 준공식 보도"],
  },
  {
    id: "beach",
    video: `${THREE}/beach.mp4`,
    still: `${THREE}/beach.jpg`,
    label: "하늘에서 본 해운대와 원산갈마의 굽은 모래사장이 겹친다.",
    sources: ["부산 해운대 드론, PHS Films", "원산갈마해안관광지구 소개편집물"],
  },
  {
    id: "noodles",
    video: `${THREE}/noodles.mp4`,
    still: `${THREE}/noodles.jpg`,
    label: "냉면 먹방의 여자와 평양랭면 보도의 여자가 같은 자리에 앉고, 두 그릇이 겹친다.",
    sources: ["문복희 물냉면 먹방", "《평양랭면풍습》 조선중앙TV 보도, 2022. 12. 11."],
  },
  {
    id: "dance",
    video: `${THREE}/dance.mp4`,
    still: `${THREE}/dance.jpg`,
    label: "대한문 앞에서 추는 춤과 평양 광장의 군중무용이 겹친다.",
    sources: ["Feel the Rhythm of KOREA: SEOUL, 한국관광공사", "평양 군중무용, KTG 관광 홍보영상"],
  },
  {
    id: "missile",
    video: `${THREE}/missile.mp4`,
    still: `${THREE}/missile.jpg`,
    label: "국군의 날의 현무-5와 열병식의 화성-20형이 발사차량 위에서 겹친다.",
    sources: ["현무-5, 제76주년 국군의 날 기념식, KBS", "화성-20형, 조선로동당 창건 80돐 열병식"],
  },
];
