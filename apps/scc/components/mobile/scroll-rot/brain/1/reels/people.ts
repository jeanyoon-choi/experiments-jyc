// The accounts under the reels: invented handles. The pictures are the non-portrait Unsplash photographs already used by
// components/mobile/clone/11 (ids copied from its model/data.ts); an account without one shows the default picture.
const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=144&h=144&q=70`;

export type Person = { user: string; name: string; avatar?: string };

export const people: Person[] = [
  { user: "jiwoo_0412", name: "지우", avatar: photo("photo-1582794543139-8ac9cb0f7b11") },
  { user: "minseo.zip", name: "민서", avatar: photo("photo-1618220179428-22790b461013") },
  { user: "kaylee.mp4", name: "Kaylee", avatar: photo("photo-1506744038136-46273834b3fb") },
  { user: "hyun__woo", name: "현우" },
  { user: "not.sleeping.rn", name: "mia", avatar: photo("photo-1537819191377-d3305ffddce4") },
  { user: "sooah_e", name: "수아", avatar: photo("photo-1490750967868-88aa4486c946") },
  { user: "luca.brt", name: "Luca Bertin", avatar: photo("photo-1548248823-ce16a73b6d49") },
  { user: "0_0.jun", name: "준", avatar: photo("photo-1568901346375-23c9450c58cd") },
  { user: "taeyang.kr", name: "태양" },
  { user: "mari_gold7", name: "Mari", avatar: photo("photo-1613539246066-78db6ec4ff0f") },
  { user: "ctrl.alt.dan", name: "Dan", avatar: photo("photo-1546636889-ba9fdd63583e") },
  { user: "yerin.jpg", name: "예린", avatar: photo("photo-1586023492125-27b2c045efd7") },
  { user: "noah.wav", name: "Noah", avatar: photo("photo-1628803184377-c5167a0cb6fd") },
  { user: "sleepy.haru", name: "하루", avatar: photo("photo-1610116306796-6fea9f4fae38") },
  { user: "dahyun_ee", name: "다현" },
  { user: "omar.irl", name: "Omar", avatar: photo("photo-1479839672679-a46483c0e7c8") },
  { user: "p1xel.mina", name: "미나", avatar: photo("photo-1478145046317-39f10e56b5e9") },
  { user: "junho_97", name: "준호", avatar: photo("photo-1773691323862-b33577111b0a") },
  { user: "ellie.exe", name: "Ellie", avatar: photo("photo-1618221195710-dd6b41faaea6") },
  { user: "seo.yeon.k", name: "서연", avatar: photo("photo-1559925393-8be0ec4767c8") },
  { user: "bbang_dduk", name: "빵떡" },
  { user: "theo.3am", name: "Theo", avatar: photo("photo-1527576539890-dfa815648363") },
  { user: "chae.won_", name: "채원", avatar: photo("photo-1556761223-4c4282c73f77") },
  { user: "ines.png", name: "Inês", avatar: photo("photo-1569096651661-820d0de8b4ab") },
  { user: "doyoon.02", name: "도윤", avatar: photo("photo-1694730750153-8b66cf3dd014") },
  { user: "user48213907", name: "user48213907" },
  { user: "sam.scrolls", name: "Sam", avatar: photo("photo-1604866830893-c13cafa515d5") },
  { user: "nari_nari_", name: "나리" },
];
