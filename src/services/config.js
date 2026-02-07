// src/services/config.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * ✅ Firestore config/editorPick 문서에서 picks 배열을 읽어옵니다.
 * - Firestore 구조:
 *   collection: "config"
 *   docId: "editorPick"
 *   field: "picks" (number[])
 */
export async function getEditorPickIds() {
  const ref = doc(db, "config", "editorPick");
  const snap = await getDoc(ref);

  if (!snap.exists()) return [];

  const data = snap.data() || {};
  const picks = Array.isArray(data.picks) ? data.picks : [];

  // 혹시 문자열이 섞여 있어도 안전하게 숫자로 정리
  return picks
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n) && n > 0);
}
