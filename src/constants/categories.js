export const DEFAULT_ARTICLE_CATEGORY = "EXHIBITION";

export const ARTICLE_CATEGORIES = [
  { key: "ART FAIR", label: "Art Fair", sub: "CATEGORY 01" },
  { key: "EXHIBITION", label: "Exhibition", sub: "CATEGORY 02" },
  { key: "REVIEW", label: "Review", sub: "CATEGORY 03" },
  { key: "INTERVIEW", label: "Interview", sub: "CATEGORY 04" },
  { key: "NEWS", label: "News", sub: "CATEGORY 05" },
  { key: "ARTIST", label: "Artist", sub: "CATEGORY 06" },
  { key: "SPACE", label: "Space", sub: "CATEGORY 07" },
  { key: "PROJECT", label: "Project", sub: "CATEGORY 08" },
  { key: "ESSAY", label: "Essay", sub: "CATEGORY 09" },
  { key: "ARCHIVE", label: "Archive", sub: "CATEGORY 10" },
];

export const ARCHIVE_CATEGORIES = [
  { key: "All", label: "View All Archive", sub: "ALL ITEMS" },
  ...ARTICLE_CATEGORIES,
];
