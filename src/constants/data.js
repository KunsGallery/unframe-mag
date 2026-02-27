/**
 * U# 매거진의 기본 데이터 아카이브입니다.
 * 나중에 Firebase 연결 시 이 구조를 참고하여 DB를 설계하면 좋습니다.
 */
export const ARTICLES = [
  {
    id: "082",
    category: "Exhibition",
    title: "UNFRAME: 시각의 경계를 허무는 기록",
    subtitle: "우리가 보는 세상의 틀은 어떻게 만들어지는가",
    date: "2026.02.26",
    author: "Kim Jae Woo",
    readTime: "5",
    views: 1240,
    likes: 124,
    excerpt: "언프레임 갤러리의 새로운 출판 프로젝트 U#의 시작을 알립니다. 예술은 고정된 틀이 아닌 흐르는 관점의 변화입니다. 이 기록은 전시를 함께 경험하는 또 다른 방식의 대화가 되어 관객과 자연스럽게 이어집니다.",
    cover: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop",
    tags: ["전시", "기록", "예술"]
  },
  {
    id: "081",
    category: "Project",
    title: "마스코트 'Pring' 디자인 가이드",
    subtitle: "부드러운 곡선 속에 담긴 예술의 유연함",
    date: "2026.02.19",
    author: "Park So-yeon",
    readTime: "8",
    views: 850,
    likes: 89,
    excerpt: "갤러리의 분위기를 대변하는 캐릭터 프링이의 탄생 과정과 그 속에 담긴 철학을 공개합니다. 프링이는 언프레임의 철학을 담아 설계되었습니다.",
    cover: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop",
    tags: ["캐릭터", "디자인", "프링"]
  }
];

export const CATEGORIES = [
  { key: "All", label: "View All Archive", sub: "ALL ITEMS" },
  { key: "Exhibition", label: "Exhibition", sub: "CATEGORY 01" },
  { key: "Project", label: "Project", sub: "CATEGORY 02" },
  { key: "Artist Note", label: "Artist Note", sub: "CATEGORY 03" },
  { key: "News", label: "News", sub: "CATEGORY 04" },
];