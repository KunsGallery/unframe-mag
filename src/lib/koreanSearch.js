// src/lib/koreanSearch.js
const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

// NFKC folds full-width letters but also turns typed jamo (ㅅ) into conjoining
// jamo (U+1100..U+1112); map those back so 초성 search keeps working.
export const normalizeSearchText = (value) =>
  String(value ?? "")
    .normalize("NFKC")
    .replace(/[ᄀ-ᄒ]/g, (char) => CHOSEONG[char.charCodeAt(0) - 0x1100])
    .toLocaleLowerCase();

// "서로를" -> "ㅅㄹㄹ"; other characters pass through unchanged.
export function toChoseong(text) {
  return [...text]
    .map((char) => {
      const code = char.charCodeAt(0) - 0xac00;
      return code >= 0 && code < 11172 ? CHOSEONG[Math.floor(code / 588)] : char;
    })
    .join("");
}

// One normalized term against text: as typed ignoring spaces, or as initial consonants ("ㄱㄹ").
export function matchesSearchTerm(text, term) {
  const compact = normalizeSearchText(text).replace(/\s+/g, "");
  if (compact.includes(term)) return true;
  return /^[ㄱ-ㅎ]+$/.test(term) && toChoseong(compact).includes(term);
}
