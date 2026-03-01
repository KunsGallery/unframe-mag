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

export function useSavedArticles() {
  const auth = useMemo(() => getAuth(), []);
  const [user, setUser] = useState(null);

  const [savedSet, setSavedSet] = useState(new Set()); // editionNo set
  const [savedDocs, setSavedDocs] = useState([]); // [{editionNo, createdAt}]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (!user) {
      setSavedSet(new Set());
      setSavedDocs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = collection(db, "users", user.uid, "saved");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSavedDocs(docs);

        const next = new Set(docs.map((x) => String(x.editionNo || x.id)));
        setSavedSet(next);
        setLoading(false);
      },
      (e) => {
        console.error("[useSavedArticles] snapshot error:", e);
        setSavedSet(new Set());
        setSavedDocs([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

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