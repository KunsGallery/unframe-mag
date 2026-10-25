import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, writeBatch } from "firebase/firestore";
import { db } from "../firebase/config";
import { useUserProfiles } from "./useUserProfiles";

export function useFollowingEditors(uid, toast) {
  const [followingEditors, setFollowingEditors] = useState([]);
  const [followingLoading, setFollowingLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      // MyPage에서 옮겨온 기존 동작 그대로: 로그아웃/권한 없음일 때 즉시 초기화
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFollowingEditors([]);
      setFollowingLoading(false);
      return;
    }

    setFollowingLoading(true);
    const ref = collection(db, "users", uid, "followingEditors");

    const unsub = onSnapshot(
      ref,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // 최근 팔로우 순
        list.sort((a, b) => {
          const at = a?.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bt = b?.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return bt - at;
        });
        setFollowingEditors(list);
        setFollowingLoading(false);
      },
      (e) => {
        console.error("[MyPage] followingEditors error:", e);
        setFollowingEditors([]);
        setFollowingLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  const followingEditorUids = useMemo(() => {
    const ids = followingEditors
      .map((item) => String(item?.id || "").trim())
      .filter(Boolean);
    return [...new Set(ids)];
  }, [followingEditors]);
  const { profiles: followingEditorProfiles } = useUserProfiles(followingEditorUids);

  const unfollow = async (editorUid) => {
    if (!uid || !editorUid) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "users", uid, "followingEditors", editorUid));
      batch.delete(doc(db, "users", editorUid, "followers", uid));
      await batch.commit();
      toast("언팔로우 완료");
    } catch (e) {
      console.error(e);
      toast("언팔로우 실패");
    }
  };

  return { followingEditors, followingLoading, followingEditorProfiles, unfollow };
}
