import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { useUserProfiles } from "./useUserProfiles";

// editor/admin 전용: 팬 수, 발행 글 수, 최근 댓글
export function useEditorDashboardStats({ isEditorOrAdmin, uid, userEmail }) {
  const [fansCount, setFansCount] = useState(0);
  const [myPublishedCount, setMyPublishedCount] = useState(0);
  const [latestComments, setLatestComments] = useState([]);
  const [latestLoading, setLatestLoading] = useState(true);

  useEffect(() => {
    if (!isEditorOrAdmin || !uid) {
      // MyPage에서 옮겨온 기존 동작 그대로: 로그아웃/권한 없음일 때 즉시 초기화
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFansCount(0);
      return;
    }

    const ref = collection(db, "users", uid, "followers");
    const unsub = onSnapshot(
      ref,
      (snap) => setFansCount(snap.size),
      (e) => {
        console.error("[MyPage] fans error:", e);
        setFansCount(0);
      }
    );
    return () => unsub();
  }, [isEditorOrAdmin, uid]);

  useEffect(() => {
    const email = String(userEmail || "").trim();
    if (!isEditorOrAdmin || !email) {
      // MyPage에서 옮겨온 기존 동작 그대로: 로그아웃/권한 없음일 때 즉시 초기화
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMyPublishedCount(0);
      return;
    }

    const qy = query(
      collection(db, "articles"),
      where("status", "==", "published"),
      where("authorEmail", "==", email)
    );

    const unsub = onSnapshot(
      qy,
      (snap) => setMyPublishedCount(snap.size),
      (e) => {
        console.error("[MyPage] my articles error:", e);
        setMyPublishedCount(0);
      }
    );

    return () => unsub();
  }, [isEditorOrAdmin, userEmail]);

  const latestCommentAuthorUids = useMemo(() => {
    const ids = latestComments
      .map((c) => String(c?.authorUid || "").trim())
      .filter(Boolean)
      .filter((authorUid) => authorUid !== uid);
    return [...new Set(ids)];
  }, [latestComments, uid]);
  const { profiles: latestCommentAuthors } = useUserProfiles(latestCommentAuthorUids);

  useEffect(() => {
    const email = String(userEmail || "").trim();
    if (!isEditorOrAdmin || !email) {
      // MyPage에서 옮겨온 기존 동작 그대로: 로그아웃/권한 없음일 때 즉시 초기화
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLatestComments([]);
      setLatestLoading(false);
      return;
    }

    // ✅ CommentSection에 articleAuthorEmail 저장한 이후부터 정상적으로 잡힘
    // 기존 댓글은 field 없을 수 있음(정상)
    setLatestLoading(true);

    const qy = query(
      collection(db, "comments"),
      where("articleAuthorEmail", "==", email),
      orderBy("createdAt", "desc"),
      limit(12)
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLatestComments(list);
        setLatestLoading(false);
      },
      (e) => {
        console.error("[MyPage] latest comments error:", e);
        setLatestComments([]);
        setLatestLoading(false);
      }
    );

    return () => unsub();
  }, [isEditorOrAdmin, userEmail]);

  return { fansCount, myPublishedCount, latestComments, latestLoading, latestCommentAuthors };
}
