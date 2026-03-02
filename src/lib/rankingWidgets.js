// src/lib/rankingWidgets.js
export const RANKING_WIDGETS = [
  { key: "night_owls", title: "Night Owls", subtitle: "00–06 활동" },
  { key: "morning_readers", title: "Morning Readers", subtitle: "06–12 활동" },
  { key: "weekend_wanderers", title: "Weekend Wanderers", subtitle: "주말 활동" },
  { key: "comment_rich_week", title: "Comment Rich", subtitle: "이번 주 댓글" },
  { key: "collectors_week", title: "Collectors", subtitle: "이번 주 저장" },
  { key: "voters_week", title: "Voters", subtitle: "이번 주 투표" },
  // … 나중에 계속 추가
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ✅ 세션 고정 랜덤
export function pickRankingWidgets(count = 3) {
  const k = "uf_rank_widgets_v1";
  const cached = sessionStorage.getItem(k);
  if (cached) {
    try {
      const keys = JSON.parse(cached);
      if (Array.isArray(keys) && keys.length) {
        return keys
          .map((key) => RANKING_WIDGETS.find((w) => w.key === key))
          .filter(Boolean);
      }
    } catch {}
  }

  const picked = shuffle(RANKING_WIDGETS).slice(0, count);
  sessionStorage.setItem(k, JSON.stringify(picked.map((x) => x.key)));
  return picked;
}