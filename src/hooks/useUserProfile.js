import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { db } from "../firebase/config";
import { resolveProfileDisplayName, resolveProfilePhotoURL } from "../lib/profileImage";

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
    let unsubscribeProfile = null;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

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
          const displayName =
            resolveProfileDisplayName(u) || fallbackNickname(u);

          const initial = {
            uid: u.uid,
            email: u.email || null,
            photoURL: resolveProfilePhotoURL(u),
            displayName,
            name: displayName,
            nickname: displayName,
            nicknameChanged: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          await setDoc(ref, initial);
          setProfile(initial);
        } else {
          const resolvedDisplayName =
            resolveProfileDisplayName(snap.data(), u) ||
            fallbackNickname(u);
          setProfile({
            id: snap.id,
            ...snap.data(),
            photoURL: resolveProfilePhotoURL(snap.data(), u),
            displayName: resolvedDisplayName,
            name: resolvedDisplayName,
            nickname: resolvedDisplayName,
          });
        }

        unsubscribeProfile = onSnapshot(
          ref,
          (liveSnap) => {
            if (!liveSnap.exists()) return;
            const data = liveSnap.data() || {};
            const resolvedDisplayName =
              resolveProfileDisplayName(data, u) || fallbackNickname(u);
            setProfile({
              id: liveSnap.id,
              ...data,
              photoURL: resolveProfilePhotoURL(data, u),
              displayName: resolvedDisplayName,
              name: resolvedDisplayName,
              nickname: resolvedDisplayName,
            });
            setLoading(false);
          },
          (e) => {
            console.error("[useUserProfile] snapshot error:", e);
            setLoading(false);
          }
        );
      } catch (e) {
        console.error("[useUserProfile] error:", e);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      unsub();
    };
  }, [auth]);

  return { user, profile, loading };
}
