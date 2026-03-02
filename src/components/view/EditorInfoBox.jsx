import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/config";

function initialsOf(name) {
  const v = String(name || "").trim();
  if (!v) return "U#";
  return v.slice(0, 2).toUpperCase();
}

export default function EditorInfoBox({ article, currentUser, onToast }) {
  const toast = (m) => (onToast ? onToast(m) : console.log(m));

  const authorEmail = String(article?.authorEmail || "").trim();
  const [editorUser, setEditorUser] = useState(null);
  const [fansCount, setFansCount] = useState(0);
  const [articleCount, setArticleCount] = useState(0);
  const [isFan, setIsFan] = useState(false);
  const [savingFan, setSavingFan] = useState(false);

  const editorUid = editorUser?.uid || null;
  const canFollow =
    !!currentUser?.uid &&
    !!editorUid &&
    currentUser.uid !== editorUid;

  useEffect(() => {
    if (!authorEmail) {
      setEditorUser(null);
      return;
    }

    const q = query(
      collection(db, "users"),
      where("email", "==", authorEmail),
      limit(1)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setEditorUser(null);
          return;
        }
        const d = snap.docs[0];
        setEditorUser({ uid: d.id, ...d.data() });
      },
      (e) => {
        console.error("[EditorInfoBox] user lookup error:", e);
        setEditorUser(null);
      }
    );

    return () => unsub();
  }, [authorEmail]);

  useEffect(() => {
    if (!editorUid) {
      setFansCount(0);
      return;
    }

    const ref = collection(db, "users", editorUid, "followers");
    const unsub = onSnapshot(
      ref,
      (snap) => setFansCount(snap.size),
      (e) => {
        console.error("[EditorInfoBox] followers error:", e);
        setFansCount(0);
      }
    );

    return () => unsub();
  }, [editorUid]);

  useEffect(() => {
    if (!authorEmail) {
      setArticleCount(0);
      return;
    }

    const q = query(
      collection(db, "articles"),
      where("authorEmail", "==", authorEmail),
      where("status", "==", "published")
    );

    const unsub = onSnapshot(
      q,
      (snap) => setArticleCount(snap.size),
      (e) => {
        console.error("[EditorInfoBox] article count error:", e);
        setArticleCount(0);
      }
    );

    return () => unsub();
  }, [authorEmail]);

  useEffect(() => {
    if (!currentUser?.uid || !editorUid) {
      setIsFan(false);
      return;
    }

    const ref = doc(db, "users", editorUid, "followers", currentUser.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => setIsFan(snap.exists()),
      (e) => {
        console.error("[EditorInfoBox] follow state error:", e);
        setIsFan(false);
      }
    );

    return () => unsub();
  }, [currentUser?.uid, editorUid]);

  const displayName = useMemo(() => {
    return (
      editorUser?.nickname ||
      article?.author ||
      article?.authorEmail ||
      "Editor"
    );
  }, [editorUser?.nickname, article?.author, article?.authorEmail]);

  const bio = useMemo(() => {
    return (
      editorUser?.bio ||
      "이 에디터가 전하는 시선과 편집의 결을 계속 만나보세요."
    );
  }, [editorUser?.bio]);

  const toggleFan = async () => {
    if (!currentUser?.uid) {
      toast("팬 되기는 로그인 후 가능해요.");
      return;
    }
    if (!editorUid) {
      toast("에디터 정보를 찾을 수 없어요.");
      return;
    }
    if (currentUser.uid === editorUid) {
      toast("본인은 팬으로 등록할 수 없어요.");
      return;
    }

    setSavingFan(true);
    try {
      const followerRef = doc(db, "users", editorUid, "followers", currentUser.uid);
      const followingRef = doc(db, "users", currentUser.uid, "followingEditors", editorUid);

      if (isFan) {
        const batch = writeBatch(db);
        batch.delete(followerRef);
        batch.delete(followingRef);
        await batch.commit();
        toast("팬 등록을 취소했어요.");
      } else {
        const batch = writeBatch(db);
        batch.set(followerRef, {
          fanUid: currentUser.uid,
          editorUid,
          createdAt: serverTimestamp(),
        });
        batch.set(followingRef, {
          editorUid,
          fanUid: currentUser.uid,
          editorName: displayName,
          editorEmail: authorEmail || null,
          createdAt: serverTimestamp(),
        });
        await batch.commit();
        toast("이제 이 에디터의 팬이 되었어요.");
      }
    } catch (e) {
      console.error("[EditorInfoBox] toggle fan error:", e);
      toast("팬 등록 처리에 실패했어요.");
    } finally {
      setSavingFan(false);
    }
  };

  if (!authorEmail) return null;

  return (
    <section className="mt-16 rounded-[28px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 md:p-8">
      <div className="text-[10px] tracking-[0.45em] uppercase font-black italic opacity-55">
        / Editor
      </div>

      <div className="mt-5 flex flex-col md:flex-row md:items-center gap-5 md:gap-6">
        <div className="w-20 h-20 rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 shrink-0 flex items-center justify-center text-lg font-black">
          {editorUser?.photoURL ? (
            <img
              src={editorUser.photoURL}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initialsOf(displayName)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-2xl md:text-3xl font-black italic tracking-tight">
              {displayName}
            </div>

            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-[#004aad]/10 text-[#004aad]">
              EDITOR
            </span>
          </div>

          <div className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            {bio}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatChip label="Published" value={articleCount} />
            <StatChip label="Fans" value={fansCount} />
            {/*authorEmail ? <StatChip label="Contact" value={authorEmail} /> : null*/}
          </div>
        </div>

        <div className="md:self-start">
          <button
            onClick={toggleFan}
            disabled={!canFollow || savingFan}
            className={[
              "px-5 py-3 rounded-2xl text-sm font-black transition",
              !canFollow || savingFan
                ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500 cursor-not-allowed"
                : isFan
                ? "border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
                : "bg-[#004aad] text-white hover:opacity-90",
            ].join(" ")}
            type="button"
          >
            {!currentUser?.uid
              ? "로그인 후 팬 되기"
              : savingFan
              ? "처리 중..."
              : isFan
              ? "팬 취소"
              : "팬 되기"}
          </button>
        </div>
      </div>
    </section>
  );
}

function StatChip({ label, value }) {
  return (
    <div className="px-3 py-2 rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="text-[10px] tracking-[0.28em] uppercase font-black opacity-45">
        {label}
      </div>
      <div className="mt-1 text-sm font-black break-all">{value}</div>
    </div>
  );
}