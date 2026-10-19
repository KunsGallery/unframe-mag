export function buildHomeSelection(articles, config = {}) {
  const byId = new Map(
    articles.map((article) => [String(article.editionNo), article]),
  );
  const unique = (items) => [
    ...new Map(
      items
        .filter(Boolean)
        .map((article) => [String(article.editionNo), article]),
    ).values(),
  ];
  const recommended = unique([
    ...(config?.editorPicks || []).map((id) => byId.get(String(id))),
    ...articles,
  ]);
  const ordered = unique([
    byId.get(String(config?.heroEditionNo)),
    ...recommended,
  ]);
  const picks = recommended
    .filter((article) => article !== ordered[0])
    .slice(0, 2);
  return {
    covers: ordered.slice(0, 3),
    picks: picks.length ? picks : ordered.slice(0, 1),
    reading: recommended.slice(0, 4),
  };
}

export function filterHomeArchive(articles, category, search = "") {
  const needle = search.trim().normalize("NFKC").toLocaleLowerCase();
  return articles.filter(
    (article) =>
      (category === "All" || article.category === category) &&
      (!needle ||
        [
          article.title,
          article.subtitle,
          article.excerpt,
          article.author,
          article.category,
          article.editionNo,
        ]
          .join(" ")
          .normalize("NFKC")
          .toLocaleLowerCase()
          .includes(needle)),
  );
}

export function positiveRankingItems(items, metric) {
  return items.filter(
    (article) =>
      Number.isFinite(Number(article[metric])) && Number(article[metric]) > 0,
  );
}
