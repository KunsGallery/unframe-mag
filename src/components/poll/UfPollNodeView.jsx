import React, { useMemo, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase/config";
import { usePollResults } from "../../hooks/usePollResults";
import { usePollMeta } from "../../hooks/usePollMeta";

const MAX_OPTIONS = 6; // ✅ 옵션 최대 개수
const MIN_OPTIONS = 2; // ✅ 옵션 최소 개수(삭제 제한)

const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function UfPollNodeView(props) {
  const { node, updateAttributes, editor } = props;
  const editable = editor?.isEditable ?? false;

  const { pollKey, question = "투표", options } = node.attrs || {};

  // ✅ options 방어: 배열이 아니면 빈 배열
  const safeOptionsRaw = Array.isArray(options) ? options : [];

  // ✅ options가 없으면(빈 poll) 에디터에서 바로 보이도록 기본 2개 자동 주입
  //    (editable일 때만 자동생성)
  const safeOptions =
    safeOptionsRaw.length > 0
      ? safeOptionsRaw
      : editable
      ? [
          { id: "a", text: "옵션 1" },
          { id: "b", text: "옵션 2" },
        ]
      : [];

  const auth = getAuth();
  const user = auth.currentUser;
  const isAdmin = !!user?.email && ADMIN_EMAILS.has(user.email);

  // ✅ 결과 집계용 optionIds는 safeOptions 기준
  const optionIds = useMemo(
    () => safeOptions.map((o) => o?.id).filter(Boolean),
    [safeOptions]
  );

  const { counts, total, loading, percentOf } = usePollResults(pollKey, optionIds);
  const { meta, loadingMeta } = usePollMeta(pollKey);

  const isClosed = !!meta?.closed;

  const [voteError, setVoteError] = useState("");

  const vote = async (optionId) => {
    setVoteError("");
    if (!user) return setVoteError("투표는 로그인 후 가능해요.");
    if (!pollKey) return setVoteError("pollKey가 없어요. (에디터에서 다시 생성 필요)");
    if (isClosed) return setVoteError("투표가 마감되었어요.");

    try {
      // ✅ 중복 방지: votes/{uid}
      await setDoc(doc(db, "polls", String(pollKey), "votes", user.uid), {
        optionId: String(optionId),
        uid: user.uid,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      setVoteError("투표 저장에 실패했어요. (이미 투표했거나 권한/마감 상태)");
    }
  };

  // ---------- editor helpers ----------
  const setQuestion = (v) => updateAttributes({ question: v });

  const addOption = () => {
    const next = [...safeOptions];
    if (next.length >= MAX_OPTIONS) return;
    next.push({ id: makeId(), text: `옵션 ${next.length + 1}` });
    updateAttributes({ options: next });
  };

  const removeOption = (id) => {
    const next = [...safeOptions];
    if (next.length <= MIN_OPTIONS) return; // ✅ 최소 2개 유지
    updateAttributes({ options: next.filter((o) => o.id !== id) });
  };

  const updateOptionText = (id, text) => {
    const next = safeOptions.map((o) => (o.id === id ? { ...o, text } : o));
    updateAttributes({ options: next });
  };

  // ---------- admin close toggle ----------
  const toggleClose = async () => {
    if (!isAdmin) return;
    if (!pollKey) return;

    try {
      await setDoc(
        doc(db, "polls", String(pollKey)),
        {
          pollKey: String(pollKey),
          closed: !isClosed,
          updatedAt: serverTimestamp(),
          updatedBy: user?.email || null,
        },
        { merge: true }
      );
    } catch (e) {
      console.error(e);
      setVoteError("마감 토글에 실패했어요.");
    }
  };

  const canRemove = safeOptions.length > MIN_OPTIONS;
  const canAdd = safeOptions.length < MAX_OPTIONS;

  return (
    <NodeViewWrapper className="uf-poll my-8">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          {editable ? (
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full text-lg font-black bg-transparent outline-none border-b border-zinc-200 dark:border-zinc-800 pb-2"
              placeholder="투표 질문"
            />
          ) : (
            <div className="text-lg font-black">{question}</div>
          )}

          <div className="flex items-center gap-2">
            <div className="text-xs font-black text-zinc-500">
              {loadingMeta ? "상태…" : isClosed ? "마감됨" : "진행중"}
            </div>

            {/* ✅ 관리자 마감/재오픈 */}
            {isAdmin && (
              <button
                onClick={toggleClose}
                type="button"
                className={[
                  "text-[11px] font-black px-3 py-1.5 rounded-full border",
                  "border-zinc-200 dark:border-zinc-800",
                  isClosed
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                    : "bg-white dark:bg-zinc-950",
                ].join(" ")}
                title="관리자 전용"
              >
                {isClosed ? "재오픈" : "마감"}
              </button>
            )}
          </div>
        </div>

        {/* Options */}
        <div className="mt-4 space-y-2">
          {safeOptions.map((o) => {
            const c = counts[o.id] || 0;
            const pct = percentOf(o.id);

            return (
              <div key={o.id} className="group">
                {editable ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={o.text || ""}
                      onChange={(e) => updateOptionText(o.id, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm"
                      placeholder="옵션 텍스트"
                    />
                    <button
                      onClick={() => removeOption(o.id)}
                      disabled={!canRemove}
                      className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-black text-zinc-500 hover:text-red-600 disabled:opacity-40 disabled:hover:text-zinc-500"
                      type="button"
                      title={canRemove ? "옵션 삭제" : `최소 ${MIN_OPTIONS}개는 유지해야 해요`}
                    >
                      삭제
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => vote(o.id)}
                    disabled={isClosed || loading}
                    className={[
                      "w-full text-left px-3 py-3 rounded-lg border transition relative overflow-hidden",
                      "border-zinc-200 dark:border-zinc-800",
                      isClosed ? "opacity-60 cursor-not-allowed" : "hover:border-[#004aad]",
                    ].join(" ")}
                    type="button"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-[#004aad]/10"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between gap-3">
                      <span className="font-bold">{o.text}</span>
                      <span className="text-xs font-black text-zinc-500">
                        {loading ? "…" : `${pct}% · ${c}`}
                      </span>
                    </div>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-500">
            총 <b>{total}</b>표
          </div>

          {editable ? (
            <div className="flex items-center gap-2">
              <button
                onClick={addOption}
                disabled={!canAdd}
                className="px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-black disabled:opacity-40"
                type="button"
                title={canAdd ? "옵션 추가" : `최대 ${MAX_OPTIONS}개까지 가능`}
              >
                옵션 추가
              </button>

              <span className="text-[11px] font-bold text-zinc-400">
                (최대 {MAX_OPTIONS} / 최소 {MIN_OPTIONS})
              </span>
            </div>
          ) : (
            <div className="text-xs text-zinc-500">
              {voteError && <span className="text-red-600 font-black">{voteError}</span>}
              {!voteError && isClosed && <span className="font-black">투표가 마감되었어요.</span>}
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}