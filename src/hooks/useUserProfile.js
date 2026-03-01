import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { db } from "../firebase/config";

// 기본 닉네임 생성(구글 displayName 없을 때 대비)
function fallbackNickname(user) {
  const tail = user?.uid ? user.uid.slice(0, 6) : Math.random().toString(36).slice(2, 8);
  return `U#-${tail}`;
}

export function useUserProfile() {
  const auth = getAuth();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          const nickname = (u.displayName && String(u.displayName).trim()) || fallbackNickname(u);

          const initial = {
            uid: u.uid,
            email: u.email || null,
            photoURL: u.photoURL || null,
            nickname,
            nicknameChanged: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await setDoc(ref, initial);
          setProfile(initial);
        } else {
          setProfile({ id: snap.id, ...snap.data() });
        }
      } catch (e) {
        console.error("[useUserProfile] error:", e);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [auth]);

  return { user, profile, loading };
}