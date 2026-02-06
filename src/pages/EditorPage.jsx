// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/** ✅ TipTap core */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/** ✅ TipTap extensions (설치돼있는 것만 씀) */
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";

/** ✅ Firebase Auth (관리자 가드) */
import { auth, googleProvider } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

/** ✅ Services */
import {
  getNextArticleId,
  getArticleByIdNumber,
  createArticle,
  updateArticle,
  listDraftArticles, // 없으면 services에서 만들어져있어야 함. 없다면 아래 draft UI는 알아서 fallback 됨.
} from "../services/articles";
import { uploadImage } from "../services/upload";

/** ✅ Router */
import { getParam, go } from "../utils/router";

/** ==============================
 *  관리자 이메일 (Firestore rules와 동일하게 유지)
 * ============================== */
const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

/** ==============================
 *  기본 카테고리 (원하면 수정)
 * ============================== */
const CATEGORY_OPTIONS = ["Exhibition", "Project", "Artist Note", "News"];

/** ==============================
 *  토스트(이모지+친근)
 * ============================== */
function useToast() {
  const [toast, setToast] = useState(null);
  const tRef = useRef(null);

  function show(message, ms = 2400) {
    setToast(message);
    window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => setToast(null), ms);
  }

  return { toast, show };
}

/** ==============================
 *  tagsText -> tags array
 * ============================== */
function parseTags(text) {
  const raw = (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // 중복 제거
  return Array.from(new Set(raw)).slice(0, 20);
}

export default function EditorPage() {
  /** URL: ?mode=editor&id=123  형태로 들어올 수 있음 */
  const idFromUrl = getParam("id");
  const idNum = idFromUrl ? Number(idFromUrl) : null;

  const { toast, show } = useToast();

  /** ==============================
   *  ✅ 관리자 가드 상태
   * ============================== */
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const adminOk = !!user?.email && ADMIN_EMAILS.has(user.email);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setCheckingAuth(false);
    });
    return () => unsub();
  }, []);

  async function adminLogin() {
    try {
      const r = await signInWithPopup(auth, googleProvider);
      const email = r?.user?.email || "";
      if (!ADMIN_EMAILS.has(email)) {
        show("🚫 관리자 계정이 아니에요. 접근할 수 없어요.", 2600);
        await signOut(auth);
      } else {
        show("✅ 관리자 로그인 완료! 환영해요 ✨", 2200);
      }
    } catch (e) {
      console.error(e);
      show("😵 로그인에 실패했어요. 다시 시도해볼까요?", 2600);
    }
  }

  async function adminLogout() {
    try {
      await signOut(auth);
      show("👋 로그아웃 완료! 다음에 또 만나요.", 2200);
    } catch (e) {
      console.error(e);
      show("😵 로그아웃이 실패했어요.", 2400);
    }
  }

  /** ==============================
   *  폼 상태
   * ============================== */
  const [firebaseId, setFirebaseId] = useState(null); // firestore doc id (수정 시 필요)
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    id: "",
    title: "",
    category: CATEGORY_OPTIONS[0],
    excerpt: "",
    tagsText: "",
    cover: "",
    coverThumb: "",
    coverMedium: "",
    status: "published", // published | draft
    createdAt: null, // 수정 시 유지용
  });

  /** draft 목록 (선택 UI) */
  const [drafts, setDrafts] = useState([]);

  /** ==============================
   *  ✅ TipTap Editor
   * ============================== */
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder: "Write something… ✍️",
      }),
    ],
    content: "",
  });

  /** ==============================
   *  ✅ 새 글 / 수정 글 로드
   * ============================== */
  useEffect(() => {
    if (!editor) return;

    let alive = true;

    (async () => {
      try {
        setLoading(true);

        // ✅ 관리자 아닐 때는 로드하지 않음 (가드 UI가 렌더됨)
        if (!adminOk) return;

        // (1) 수정 모드
        if (idNum) {
          const a = await getArticleByIdNumber(idNum);
          if (!alive) return;

          if (!a) {
            show("😮 글을 찾지 못했어요. 리스트로 돌아갈게요.", 2600);
            go("?mode=list");
            return;
          }

          setFirebaseId(a.firebaseId || a._firebaseId || null);

          setForm({
            id: String(a.id ?? ""),
            title: a.title ?? "",
            category: a.category ?? CATEGORY_OPTIONS[0],
            excerpt: a.excerpt ?? "",
            tagsText: Array.isArray(a.tags) ? a.tags.join(", ") : "",
            cover: a.cover ?? "",
            coverThumb: a.coverThumb ?? "",
            coverMedium: a.coverMedium ?? "",
            status: a.status ?? "published",
            createdAt: a.createdAt ?? null,
          });

          editor.commands.setContent(a.contentHTML || "");
          show("🛠️ 글을 불러왔어요! 수정해볼까요?", 1800);
        }
        // (2) 새 글 모드
        else {
          const nextId = await getNextArticleId();
          if (!alive) return;

          setFirebaseId(null);
          setForm((p) => ({
            ...p,
            id: String(nextId),
            title: "",
            excerpt: "",
            tagsText: "",
            cover: "",
            coverThumb: "",
            coverMedium: "",
            status: "published",
            createdAt: null,
          }));

          editor.commands.setContent("");
          show("✨ 새 글을 시작해볼까요?", 1600);
        }

        // (3) draft 목록 불러오기 (서비스 없으면 자동 무시)
        try {
          const d = await (listDraftArticles?.() ?? Promise.resolve([]));
          if (!alive) return;
          setDrafts(Array.isArray(d) ? d : []);
        } catch {
          // draft 기능은 없어도 됨
          setDrafts([]);
        }
      } catch (e) {
        console.error(e);
        show("😵 에디터 로딩 중 문제가 생겼어요.", 2400);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [editor, idNum, adminOk]); // adminOk가 true 될 때 로드

  /** ==============================
   *  커버 업로드
   * ============================== */
  async function onPickCover(file) {
    if (!file) return;

    try {
      show("🖼️ 커버 업로드 중… 잠시만요!", 1600);

      const res = await uploadImage(file);

      setForm((p) => ({
        ...p,
        cover: res.url || "",
        coverThumb: res.thumbUrl || p.coverThumb || "",
        coverMedium: res.mediumUrl || p.coverMedium || "",
      }));

      show("✅ 커버 업로드 완료! 멋져요 ✨", 2000);
    } catch (e) {
      console.error(e);
      show("😵 커버 업로드 실패! 파일 크기/네트워크를 확인해주세요.", 2600);
    }
  }

  function onCoverInput(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPickCover(f);
  }

  /** ==============================
   *  본문 이미지 업로드
   * ============================== */
  async function onPickBodyImage(file) {
    if (!file || !editor) return;

    try {
      show("🖼️ 본문 이미지 업로드 중…", 1600);
      const res = await uploadImage(file);
      const url = res.url;

      if (!url) throw new Error("no url");

      editor.chain().focus().setImage({ src: url }).run();
      show("✅ 이미지 삽입 완료!", 1600);
    } catch (e) {
      console.error(e);
      show("😵 본문 이미지 업로드 실패! (네트워크/용량 확인)", 2600);
    }
  }

  function onBodyImageInput(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPickBodyImage(f);
  }

  /** ✅ 드래그&드롭(본문) */
  useEffect(() => {
    if (!editor) return;

    const el = document.querySelector(".uf-editor .ProseMirror");
    if (!el) return;

    function onDrop(ev) {
      const file = ev.dataTransfer?.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return;

      ev.preventDefault();
      onPickBodyImage(file);
    }

    function onDragOver(ev) {
      const file = ev.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        ev.preventDefault();
      }
    }

    el.addEventListener("drop", onDrop);
    el.addEventListener("dragover", onDragOver);
    return () => {
      el.removeEventListener("drop", onDrop);
      el.removeEventListener("dragover", onDragOver);
    };
  }, [editor]);

  /** ==============================
   *  2/3단 삽입 (HTML 방식: 안전/안깨짐)
   *  - “node 방식”은 schema가 필요해서 깨질 수 있음
   *  - HTML 방식은 그냥 div를 삽입하므로 안정적
   * ============================== */
  function insertColumns(n) {
    if (!editor) return;

    const cols =
      n === 2
        ? `
<div class="uf-cols uf-cols-2">
  <div class="uf-col"><p>Column 1</p></div>
  <div class="uf-col"><p>Column 2</p></div>
</div>
<p></p>
`
        : `
<div class="uf-cols uf-cols-3">
  <div class="uf-col"><p>Column 1</p></div>
  <div class="uf-col"><p>Column 2</p></div>
  <div class="uf-col"><p>Column 3</p></div>
</div>
<p></p>
`;

    editor.chain().focus().insertContent(cols).run();
    show(`📚 ${n}단 레이아웃을 넣었어요!`, 1800);
  }

  /** ==============================
   *  저장 (draft / publish)
   * ============================== */
  async function onSave(statusType) {
    if (!editor) return;

    const id = Number(form.id);
    const title = form.title.trim();
    const excerpt = form.excerpt.trim();
    const tags = parseTags(form.tagsText);

    if (!id || Number.isNaN(id)) {
      show("😵 글 번호(id)가 이상해요. 새로고침 후 다시 시도해줘요.", 2800);
      return;
    }
    if (!title) {
      show("✍️ 제목을 먼저 적어주세요!", 2200);
      return;
    }

    try {
      const contentHTML = editor.getHTML();

      // ✅ payload 스키마 (rules에 맞게 “undefined” 금지)
      const payload = {
        id,
        title,
        category: form.category,
        excerpt,
        status: statusType,
        contentHTML,

        cover: form.cover || "",
        coverThumb: form.coverThumb || "",
        coverMedium: form.coverMedium || "",
        tags,

        // ✅ createdAt 유지 (수정 시 절대 깨지지 않게)
        createdAt: form.createdAt ?? null,
      };

      // ✅ 새 글: create / 수정: update
      if (!idNum) {
        show(statusType === "draft" ? "📝 드래프트 저장 중…" : "🚀 발행 중…", 1600);

        const newFirebaseId = await createArticle(payload);
        // createArticle가 firebaseId를 return하도록 만들어져 있으면 best
        if (newFirebaseId) setFirebaseId(newFirebaseId);

        show(statusType === "draft" ? "✅ 드래프트로 저장했어요!" : "🎉 발행 완료! 뷰로 이동할게요.", 2200);

        if (statusType !== "draft") {
          go(`?mode=view&id=${id}`);
        }
      } else {
        if (!firebaseId) {
          show("😵 수정 대상(firebaseId)을 찾지 못했어요. 다시 열어주세요.", 3000);
          return;
        }

        show(statusType === "draft" ? "🛠️ 드래프트로 수정 저장…" : "🛠️ 발행 상태로 수정 저장…", 1600);
        await updateArticle(firebaseId, payload);

        show("✅ 저장 완료! 아주 좋아요 ✨", 2000);

        if (statusType !== "draft") {
          go(`?mode=view&id=${id}`);
        }
      }
    } catch (e) {
      console.error(e);
      show("😵 저장 중 오류가 발생했어요. 콘솔을 확인해주세요.", 3000);
    }
  }

  /** draft 목록에서 선택해 편집 이동 */
  function openDraft(a) {
    if (!a?.id) return;
    go(`?mode=editor&id=${a.id}`);
  }

  /** ==============================
   *  ✅ 관리자 가드 UI
   * ============================== */
  if (checkingAuth) {
    return (
      <div className="uf-container" style={{ padding: "120px 16px" }}>
        확인 중… ⏳
      </div>
    );
  }

  if (!adminOk) {
    return (
      <div className="uf-container" style={{ padding: "120px 16px" }}>
        {toast && <div className="uf-toast">{toast}</div>}

        <h2 style={{ fontSize: 28, marginBottom: 10 }}>🔐 Admin Only</h2>
        <p style={{ marginBottom: 16, color: "rgba(0,0,0,.65)" }}>
          이 페이지는 관리자만 접근할 수 있어요.
        </p>

        <button className="uf-btn uf-btn--primary" onClick={adminLogin}>
          Google로 로그인
        </button>

        <div style={{ marginTop: 12 }}>
          <button className="uf-btn uf-btn--ghost" onClick={() => go("?mode=list")}>
            ← 리스트로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  /** ==============================
   *  메인 UI
   * ============================== */
  if (loading || !editor) {
    return (
      <div className="uf-container" style={{ padding: "120px 16px" }}>
        {toast && <div className="uf-toast">{toast}</div>}
        로딩 중… ⏳
      </div>
    );
  }

  return (
    <div className="uf-container" style={{ padding: "24px 16px" }}>
      {toast && <div className="uf-toast">{toast}</div>}

      {/* 상단 바 */}
      <div className="uf-editorTop">
        <button className="uf-btn uf-btn--ghost" onClick={() => go("?mode=list")}>
          ← Back to list
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            {user?.email ? `👤 ${user.email}` : ""}
          </div>
          <button className="uf-btn uf-btn--ghost" onClick={adminLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Draft 목록 (있을 때만) */}
      {Array.isArray(drafts) && drafts.length > 0 && (
        <div className="uf-draftBox" style={{ marginTop: 14 }}>
          <div className="uf-draftBox__title">📝 Drafts</div>
          <div className="uf-draftBox__list">
            {drafts.slice(0, 10).map((d) => (
              <button key={d.id} className="uf-draftItem" onClick={() => openDraft(d)}>
                No.{d.id} — {d.title || "(no title)"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 메타 폼 */}
      <div className="uf-form" style={{ marginTop: 18 }}>
        <div className="uf-formRow">
          <label className="uf-label">ID</label>
          <input
            className="uf-input"
            value={form.id}
            onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
            disabled={!!idNum} // 수정 모드에서는 id 변경 금지
          />
        </div>

        <div className="uf-formRow">
          <label className="uf-label">Title</label>
          <input
            className="uf-input"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="제목을 입력하세요"
          />
        </div>

        <div className="uf-formRow">
          <label className="uf-label">Category</label>
          <select
            className="uf-input"
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="uf-formRow">
          <label className="uf-label">Excerpt</label>
          <textarea
            className="uf-textarea"
            value={form.excerpt}
            onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
            placeholder="리스트 카드에 보일 짧은 소개를 적어주세요"
          />
        </div>

        <div className="uf-formRow">
          <label className="uf-label">Tags</label>
          <input
            className="uf-input"
            value={form.tagsText}
            onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
            placeholder="예: 전시, 인사동, 언프레임 (콤마로 구분)"
          />
        </div>

        {/* 커버 업로드 */}
        <div className="uf-formRow">
          <label className="uf-label">Cover</label>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label className="uf-btn uf-btn--primary" style={{ cursor: "pointer" }}>
              Upload Cover
              <input type="file" accept="image/*" onChange={onCoverInput} style={{ display: "none" }} />
            </label>

            {form.cover ? (
              <button
                className="uf-btn uf-btn--ghost"
                onClick={() => {
                  setForm((p) => ({ ...p, cover: "", coverThumb: "", coverMedium: "" }));
                  show("🧹 커버를 제거했어요.", 1600);
                }}
              >
                Remove
              </button>
            ) : (
              <div style={{ fontSize: 13, opacity: 0.7 }}>커버 업로드하면 미리보기가 떠요.</div>
            )}
          </div>

          {form.cover ? (
            <div style={{ marginTop: 10 }}>
              <img
                src={form.coverMedium || form.coverThumb || form.cover}
                alt="cover preview"
                style={{ width: "100%", maxWidth: 520, borderRadius: 14, border: "1px solid rgba(0,0,0,.12)" }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* 툴바 */}
      <div className="uf-toolbar" style={{ marginTop: 18 }}>
        {/* 텍스트 */}
        <button className="uf-tool" onClick={() => editor.chain().focus().toggleBold().run()}>
          Bold
        </button>
        <button className="uf-tool" onClick={() => editor.chain().focus().toggleItalic().run()}>
          Italic
        </button>
        <button className="uf-tool" onClick={() => editor.chain().focus().toggleUnderline().run()}>
          Underline
        </button>
        <button className="uf-tool" onClick={() => editor.chain().focus().toggleHighlight().run()}>
          Highlight
        </button>

        <span className="uf-toolSep" />

        {/* 정렬 */}
        <button className="uf-tool" onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          Left
        </button>
        <button className="uf-tool" onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          Center
        </button>
        <button className="uf-tool" onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          Right
        </button>

        <span className="uf-toolSep" />

        {/* 리스트 */}
        <button className="uf-tool" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          • List
        </button>
        <button className="uf-tool" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1. List
        </button>

        <span className="uf-toolSep" />

        {/* 인용/구분선 */}
        <button className="uf-tool" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          Quote
        </button>
        <button className="uf-tool" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          Divider
        </button>

        <span className="uf-toolSep" />

        {/* 링크 */}
        <button
          className="uf-tool"
          onClick={() => {
            const prev = editor.getAttributes("link").href;
            const url = window.prompt("링크 URL을 입력하세요", prev || "https://");
            if (url === null) return;
            if (url.trim() === "") {
              editor.chain().focus().unsetLink().run();
              show("🔗 링크를 제거했어요.", 1600);
              return;
            }
            editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
            show("🔗 링크를 설정했어요!", 1600);
          }}
        >
          Link
        </button>

        <span className="uf-toolSep" />

        {/* 본문 이미지 업로드 */}
        <label className="uf-tool uf-tool--file" style={{ cursor: "pointer" }}>
          Upload Image
          <input type="file" accept="image/*" onChange={onBodyImageInput} style={{ display: "none" }} />
        </label>

        <span className="uf-toolSep" />

        {/* 컬럼 */}
        <button className="uf-tool" onClick={() => insertColumns(2)}>
          2 Col
        </button>
        <button className="uf-tool" onClick={() => insertColumns(3)}>
          3 Col
        </button>

        <span className="uf-toolSep" />

        <button className="uf-tool" onClick={() => editor.chain().focus().undo().run()}>
          Undo
        </button>
        <button className="uf-tool" onClick={() => editor.chain().focus().redo().run()}>
          Redo
        </button>
      </div>

      {/* 에디터 */}
      <div className="uf-editor" style={{ marginTop: 12 }}>
        <EditorContent editor={editor} />
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
          💡 이미지는 드래그&드롭으로도 업로드돼요. (이미지 파일만)
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="uf-actions" style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="uf-btn uf-btn--ghost" onClick={() => onSave("draft")}>
          Save Draft
        </button>
        <button className="uf-btn uf-btn--primary" onBClick={() => {}} onClick={() => onSave("published")}>
          Publish
        </button>
      </div>
    </div>
  );
}
