import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function getEditorPickIds() {
  try {
    const snap = await getDoc(doc(db, "config", "editorPick"));
    if (!snap.exists()) return [];
    const data = snap.data();
    const picks = data?.picks;
    return Array.isArray(picks) ? picks.map(Number).filter((n) => !Number.isNaN(n)) : [];
  } catch {
    return [];
  }
}
