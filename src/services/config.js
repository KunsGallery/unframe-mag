// src/services/config.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

/**
 * ✅ Editor's Pick ids 가져오기
 * - Firestore 위치: config / editorPick
 * - 문서 필드: picks: number[]  (예: [12, 7, 3])
 */
export async function getEditorPickIds() {
  const ref = doc(db, "config", "editorPick");
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];

  const data = snap.data() || {};
  const picks = Array.isArray(data.picks) ? data.picks : [];
  // 숫자만 남기고 정리
  return picks.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
}
