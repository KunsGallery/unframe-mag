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

const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
// NFKC folds full-width letters but also turns typed jamo (ㅅ) into conjoining
// jamo (U+1100..U+1112); map those back so 초성 search keeps working.
const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u1100-\u1112]/g, (char) => CHOSEONG[char.charCodeAt(0) - 0x1100])
    .toLocaleLowerCase();

// "서로를" -> "ㅅㄹㄹ"; other characters pass through unchanged.
function toChoseong(text) {
  return [...text]
    .map((char) => {
      const code = char.charCodeAt(0) - 0xac00;
      return code >= 0 && code < 11172 ? CHOSEONG[Math.floor(code / 588)] : char;
    })
    .join("");
}

function searchFields(article) {
  const text = normalizeText(
    [
      article.title,
      article.subtitle,
      article.excerpt,
      article.author,
      article.category,
      ...(Array.isArray(article.tags) ? article.tags : []),
    ].join(" "),
  );
  const compact = text.replace(/\s+/g, "");
  return { compact, choseong: toChoseong(compact), edition: Number(article.editionNo) };
}

// Every word must match: as typed ignoring spaces, as Korean initial consonants
// ("ㅅㄹ"), or as an edition number ("6", "#006", "no.6").
function matchesTerm(fields, term) {
  const edition = term.match(/^(?:#|no\.?)?0*(\d+)$/);
  if (edition && Number(edition[1]) === fields.edition) return true;
  if (fields.compact.includes(term)) return true;
  return /^[ㄱ-ㅎ]+$/.test(term) && fields.choseong.includes(term);
}

export function filterHomeArchive(articles, category, search = "") {
  const terms = normalizeText(search).split(/\s+/).filter(Boolean);
  return articles.filter((article) => {
    if (category !== "All" && article.category !== category) return false;
    if (!terms.length) return true;
    const fields = searchFields(article);
    return terms.every((term) => matchesTerm(fields, term));
  });
}

export function positiveRankingItems(items, metric) {
  return items.filter(
    (article) =>
      Number.isFinite(Number(article[metric])) && Number(article[metric]) > 0,
  );
}
