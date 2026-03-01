import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { GoogleAuthProvider, signInWithPopup, signOut, getAuth } from "firebase/auth";
import { db } from "../../firebase/config";
import { useUserProfile } from "../../hooks/useUserProfile";

/** ✅ 관리자 이메일 allowlist (rules와 동일하게 유지) */
const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

/** ✅ 스팸 방지(프론트 쿨타임) */
const COOLDOWN_MS = 30_000; // 30초

function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  return `${day}일 전`;
}

function lsKey(uid, editionNo, suffix) {
  return `uf_comment_${suffix}_${uid}_${editionNo}`;
}

export default function CommentSection({ article }) {
  const editionNo = article?.editionNo ? String(article.editionNo) : null;

  const auth = useMemo(() => getAuth(), []);
  const { user, profile, loading: loadingProfile } = useUserProfile();

  const isAdmin = !!user?.email && ADMIN_EMAILS.has(user.email);

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);

  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  // 쿨타임 표시용
  const [cooldownLeft, setCooldownLeft] = useState(0);

  /** 댓글 실시간 구독 */
  useEffect(() => {
    if (!editionNo) return;

    setLoadingComments(true);
    const q = query(
      collection(db, "comments"),
      where("editionNo", "==", editionNo),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setComments(list);
        setLoadingComments(false);
      },
      (e) => {
        console.error("[CommentSection] snapshot error:", e);
        setError("댓글을 불러오지 못했어요.");
        setLoadingComments(false);
      }
    );

    return () => unsub();
  }, [editionNo]);

  /** ✅ 쿨타임 타이머(로그인 상태일 때만) */
  useEffect(() => {
    if (!user || !editionNo) {
      setCooldownLeft(0);
      return;
    }

    const tick = () => {
      try {
        const raw = localStorage.getItem(lsKey(user.uid, editionNo, "lastAt"));
        const lastAt = raw ? Number(raw) : 0;
        const left = Math.max(0, COOLDOWN_MS - (Date.now() - lastAt));
        setCooldownLeft(left);
      } catch {
        setCooldownLeft(0);
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [user, editionNo]);

  const login = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
      setError("로그인에 실패했어요.");
    }
  };

  const logout = async () => {
    setError("");
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
      setError("로그아웃에 실패했어요.");
    }
  };

  /** ✅ 1.7 스팸 방지(쿨타임 + 연속 중복 방지) */
  const canPostNow = () => {
    if (!user || !editionNo) return { ok: false, msg: "로그인이 필요해요." };

    // 30초 쿨타임
    try {
      const raw = localStorage.getItem(lsKey(user.uid, editionNo, "lastAt"));
      const lastAt = raw ? Number(raw) : 0;
      if (lastAt && Date.now() - lastAt < COOLDOWN_MS) {
        const sec = Math.ceil((COOLDOWN_MS - (Date.now() - lastAt)) / 1000);
        return { ok: false, msg: `잠깐! ${sec}초 후에 다시 작성할 수 있어요.` };
      }
    } catch {
      // localStorage 실패 시엔 쿨타임 무시(치명적이지 않게)
    }

    // 같은 내용 연속 등록 방지(간단)
    try {
      const raw = localStorage.getItem(lsKey(user.uid, editionNo, "lastText"));
      const lastText = raw ? String(raw) : "";
      if (lastText && lastText === text.trim()) {
        return { ok: false, msg: "같은 내용을 연속으로 등록할 수 없어요." };
      }
    } catch {}

    return { ok: true, msg: "" };
  };

  const submit = async () => {
    setError("");

    if (!user) return setError("댓글을 작성하려면 로그인해야 해요.");
    if (!editionNo) return setError("글 정보를 찾을 수 없어요.");
    if (loadingProfile) return setError("프로필 로딩 중이에요. 잠깐만!");

    const clean = text.trim();
    if (clean.length < 1) return setError("댓글 내용을 입력해줘.");
    if (clean.length > 500) return setError("댓글은 500자 이내로 작성해줘.");

    const nickname = profile?.nickname?.trim();
    if (!nickname) return setError("닉네임이 없어요. My#에서 닉네임을 설정해줘.");

    // ✅ 스팸 방지 체크
    const gate = canPostNow();
    if (!gate.ok) return setError(gate.msg);

    setPosting(true);
    try {
      await addDoc(collection(db, "comments"), {
        editionNo,
        sortIndex: typeof article?.sortIndex === "number" ? article.sortIndex : null,
        articleTitle: article?.title ? String(article.title) : null,

        text: clean,
        nickname, // ✅ 댓글에서 수정 불가

        authorUid: user.uid,
        authorEmail: user.email || null,
        authorPhotoURL: user.photoURL || null,

        createdAt: serverTimestamp(),
      });

      // ✅ 쿨타임/중복 저장
      try {
        localStorage.setItem(lsKey(user.uid, editionNo, "lastAt"), String(Date.now()));
        localStorage.setItem(lsKey(user.uid, editionNo, "lastText"), clean);
      } catch {}

      setText("");
    } catch (e) {
      console.error(e);
      setError("댓글 등록에 실패했어요.");
    } finally {
      setPosting(false);
    }
  };

  /** ✅ 1.6 관리자 삭제: 본인 OR 관리자 */
  const remove = async (commentId, authorUid) => {
    setError("");
    if (!user) return;

    const canDelete = isAdmin || user.uid === authorUid;
    if (!canDelete) return setError("삭제 권한이 없어요.");

    try {
      await deleteDoc(doc(db, "comments", commentId));
    } catch (e) {
      console.error(e);
      setError("삭제에 실패했어요.");
    }
  };

  return (
    <section className="mt-16 border-t border-zinc-200 dark:border-zinc-800 pt-10">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-black tracking-tight">Comments</h3>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {profile?.nickname || user.email}
              </span>
              {isAdmin && (
                <span className="text-[10px] px-2 py-1 rounded-full bg-[#004aad] text-white font-black">
                  ADMIN
                </span>
              )}
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-xs font-bold"
              >
                로그아웃
              </button>
            </>
          ) : (
            <button
              onClick={login}
              className="px-3 py-1.5 rounded-md bg-black text-white dark:bg-white dark:text-black text-xs font-black"
            >
              Google로 로그인
            </button>
          )}
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white/70 dark:bg-zinc-900/40">
        {user ? (
          <>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              작성자: <b>{profile?.nickname || "프로필 로딩..."}</b> (댓글에서 변경 불가)
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="댓글을 남겨주세요 (최대 500자)"
              className="w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm min-h-[90px]"
            />

            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {text.trim().length}/500
              </span>

              <button
                onClick={submit}
                disabled={posting || cooldownLeft > 0}
                className="px-4 py-2 rounded-md bg-[#004aad] text-white text-sm font-black disabled:opacity-50"
                title={
                  cooldownLeft > 0
                    ? `쿨타임: ${Math.ceil(cooldownLeft / 1000)}초`
                    : ""
                }
              >
                {posting
                  ? "등록 중..."
                  : cooldownLeft > 0
                  ? `대기 ${Math.ceil(cooldownLeft / 1000)}s`
                  : "댓글 등록"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            댓글을 작성하려면 <b>Google 로그인</b>이 필요해요.
          </div>
        )}

        {error && <div className="mt-3 text-sm font-bold text-red-600">{error}</div>}
      </div>

      {/* 목록 */}
      <div className="mt-8">
        {loadingComments ? (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">댓글 불러오는 중...</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            아직 댓글이 없어요. 첫 댓글을 남겨보세요!
          </div>
        ) : (
          <ul className="space-y-4">
            {comments.map((c) => {
              const commentIsAdmin = !!c.authorEmail && ADMIN_EMAILS.has(c.authorEmail);
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{c.nickname || "익명"}</span>

                        {commentIsAdmin && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#004aad] text-white font-black">
                            ADMIN
                          </span>
                        )}

                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {timeAgo(c.createdAt)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{c.text}</p>
                    </div>

                    {(isAdmin || user?.uid === c.authorUid) && (
                      <button
                        onClick={() => remove(c.id, c.authorUid)}
                        className="text-xs font-black text-zinc-500 hover:text-red-600"
                        title={isAdmin && user?.uid !== c.authorUid ? "관리자 삭제" : "삭제"}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}