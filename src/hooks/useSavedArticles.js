import { useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

const EMPTY_SAVED_SET = new Set();

export function useSavedArticles() {
  const auth = useMemo(() => getAuth(), []);
  const [user, setUser] = useState(null);

  const uid = user?.uid || "";
  const [savedState, setSavedState] = useState({
    uid: "",
    savedSet: EMPTY_SAVED_SET,
    savedDocs: [],
    loading: false,
  });
  const isCurrent = savedState.uid === uid;
  const savedSet = uid && isCurrent ? savedState.savedSet : EMPTY_SAVED_SET; // editionNo set
  const savedDocs = uid && isCurrent ? savedState.savedDocs : []; // [{editionNo, createdAt}]
  const loading = uid ? !isCurrent || savedState.loading : false;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (!uid) return;

    const ref = collection(db, "users", uid, "saved");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const next = new Set(docs.map((x) => String(x.editionNo || x.id)));
        setSavedState({ uid, savedDocs: docs, savedSet: next, loading: false });
      },
      (e) => {
        console.error("[useSavedArticles] snapshot error:", e);
        setSavedState({ uid, savedDocs: [], savedSet: EMPTY_SAVED_SET, loading: false });
      }
    );

    return () => unsub();
  }, [uid]);

  const isSaved = (editionNo) => savedSet.has(String(editionNo));

  const save = async (editionNo, articleMeta = {}) => {
    if (!user) throw new Error("Login required");
    const id = String(editionNo);
    await setDoc(doc(db, "users", user.uid, "saved", id), {
      editionNo: id,
      title: articleMeta.title || null,
      coverMedium: articleMeta.coverMedium || null,
      cover: articleMeta.cover || null,
      category: articleMeta.category || null,
      createdAt: serverTimestamp(),
    });
  };

  const unsave = async (editionNo) => {
    if (!user) throw new Error("Login required");
    const id = String(editionNo);
    await deleteDoc(doc(db, "users", user.uid, "saved", id));
  };

  const toggleSave = async (editionNo, articleMeta = {}) => {
    if (isSaved(editionNo)) return unsave(editionNo);
    return save(editionNo, articleMeta);
  };

  return { user, loading, savedDocs, isSaved, save, unsave, toggleSave };
}
