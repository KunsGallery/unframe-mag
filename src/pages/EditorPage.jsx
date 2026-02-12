// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";

import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";

import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Youtube from "@tiptap/extension-youtube";

import { Extension } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

import { auth, googleProvider } from "../firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

import {
  getNextArticleId,
  getArticleByIdNumber,
  createArticle,
  updateArticle,
  listDraftArticles,
} from "../services/articles";

import { uploadImage } from "../services/upload";

import BlockPlusMenu from "../components/BlockPlusMenu";
import { UfImage } from "../tiptap/nodes/UfImage";
import { Scene } from "../tiptap/nodes/Scene.jsx";
import { StickyStory } from "../tiptap/nodes/StickyStory.jsx";
import { ParallaxImage } from "../tiptap/nodes/ParallaxImage.jsx";

const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

const CATEGORY_OPTIONS = ["Exhibition", "Project", "Artist Note", "News"];

/** ✅ FIX: show 함수 참조를 안정적으로 유지(useCallback) */
function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const show = useCallback((msg, ms = 2200) => {
    setToast(msg);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { toast, show };
}

function parseTags(text) {
  const raw = (text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(raw)).slice(0, 30);
}

function withTimeout(promise, ms = 5000, label = "timeout") {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error(label)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

/* =============================================================================
  ViewPage hydrate 로직 (Preview에서도 사용)
============================================================================= */
function hydrateMagazineNodes(rootEl) {
  if (!rootEl) return;

  rootEl.querySelectorAll("[data-uf-node-ui]").forEach((el) => {
    el.style.display = "none";
  });

  const sceneSelectors = [
    'section[data-uf-node="scene"]',
    'div[data-uf-node="scene"]',
    'section[data-node="scene"]',
    'div[data-node="scene"]',
    'section[data-type="scene"]',
    'div[data-type="scene"]',
    'section[data-uf="scene"]',
    'div[data-uf="scene"]',
  ];
  const scenes = rootEl.querySelectorAll(sceneSelectors.join(","));

  scenes.forEach((scene) => {
    scene.classList.add("uf-scene", "uf-reveal");
    Array.from(scene.children).forEach((ch) => {
      if (ch.tagName === "HR") return;
      ch.classList.add("uf-reveal");
    });
  });

  const stickySelectors = [
    'section[data-uf-node="sticky"]',
    'div[data-uf-node="sticky"]',
    'section[data-node="sticky"]',
    'div[data-node="sticky"]',
    'section[data-type="sticky"]',
    'div[data-type="sticky"]',
    'section[data-uf="sticky"]',
    'div[data-uf="sticky"]',
  ];
  const stickies = rootEl.querySelectorAll(stickySelectors.join(","));

  stickies.forEach((wrap) => {
    wrap.classList.add("uf-scene", "uf-reveal");

    const hasGrid = wrap.querySelector(".uf-stickyStory");
    if (hasGrid) return;

    const kids = Array.from(wrap.children);
    if (!kids.length) return;

    const media =
      kids.find((k) => k.querySelector?.("img") || k.tagName === "IMG" || k.tagName === "FIGURE") || kids[0];

    const grid = document.createElement("div");
    grid.className = "uf-stickyStory";

    const mediaBox = document.createElement("div");
    mediaBox.className = "uf-stickyMedia";

    const textBox = document.createElement("div");
    textBox.className = "uf-stickyText";

    mediaBox.appendChild(media);
    kids.filter((k) => k !== media).forEach((k) => textBox.appendChild(k));

    grid.appendChild(mediaBox);
    grid.appendChild(textBox);

    wrap.innerHTML = "";
    wrap.appendChild(grid);
  });

  const imgSelectors = [
    'img[data-uf="parallax"]',
    'img[data-uf-node="parallax"]',
    'img[data-node="parallax"]',
    'img[data-type="parallax"]',
    'img[data-parallax="true"]',
    'img[data-parallax="1"]',
  ];
  const pimgs = rootEl.querySelectorAll(imgSelectors.join(","));

  pimgs.forEach((img) => {
    img.setAttribute("data-uf", "parallax");
    img.classList.add("uf-parallax");
    if (!img.getAttribute("data-speed")) img.setAttribute("data-speed", "0.18");

    const fig = img.closest("figure");
    if (fig) fig.classList.add("uf-reveal");
  });

  rootEl.querySelectorAll("hr").forEach((hr) => {
    hr.classList.add("uf-reveal");
  });

  rootEl.querySelectorAll("blockquote, figure, h2, h3, p").forEach((el) => {
    el.classList.add("uf-reveal");
  });
}

/* =============================================================================
  Preview Modal
============================================================================= */
function PreviewModal({ open, onClose, title, category, cover, excerpt, html }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const root = bodyRef.current;
    if (!root) return;

    hydrateMagazineNodes(root);

    const els = Array.from(root.querySelectorAll(".uf-reveal"));
    els.forEach((el) => el.classList.remove("is-in"));

    const io = new IntersectionObserver(
      (entries) => {
        for (const ent of entries) {
          if (ent.isIntersecting) ent.target.classList.add("is-in");
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [open, html]);

  if (!open) return null;

  return (
    <div
      className="uf-modalBackdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(0,0,0,.55)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        className="uf-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "90vh",
          overflow: "hidden",
          borderRadius: 18,
          border: "1px solid color-mix(in srgb, var(--line) 70%, transparent)",
          background: "var(--panel)",
          boxShadow: "var(--shadow)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="uf-modalHead"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ fontWeight: 900 }}>👁 Preview</div>
          <button className="uf-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ overflow: "auto" }}>
          <div style={{ position: "relative", padding: 18, borderBottom: "1px solid var(--line)" }}>
            <div
              style={{
                height: 160,
                borderRadius: 16,
                backgroundImage: cover
                  ? `url(${cover})`
                  : "linear-gradient(135deg, rgba(37,99,235,.55), rgba(0,0,0,.15))",
                backgroundSize: "cover",
                backgroundPosition: "center",
                border: "1px solid var(--line)",
              }}
            />
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, opacity: 0.8, fontWeight: 800 }}>{category || "UNFRAME"}</div>
              <div style={{ fontSize: 28, fontWeight: 950, lineHeight: 1.1, marginTop: 4 }}>
                {title || "(no title)"}
              </div>
              {excerpt ? (
                <div style={{ marginTop: 10, opacity: 0.9, lineHeight: 1.6, maxWidth: 900 }}>{excerpt}</div>
              ) : null}
            </div>
          </div>

          <div style={{ padding: 18 }}>
            <div ref={bodyRef} className="ProseMirror" dangerouslySetInnerHTML={{ __html: html || "" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =============================================================================
  Upload Handler Extension (Paste/Drop)
============================================================================= */
function makeUploadHandler() {
  return Extension.create({
    name: "ufUploadHandler",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          props: {
            handlePaste: (_view, event) => {
              const items = Array.from(event.clipboardData?.items || []);
              const fileItem = items.find((it) => it.kind === "file" && it.type.startsWith("image/"));
              if (!fileItem) return false;

              const file = fileItem.getAsFile();
              if (!file) return false;

              window.__UF_UPLOAD_IMAGE__?.(file);
              return true;
            },
            handleDrop: (_view, event) => {
              const file = event.dataTransfer?.files?.[0];
              if (!file || !file.type.startsWith("image/")) return false;

              window.__UF_UPLOAD_IMAGE__?.(file);
              return true;
            },
          },
        }),
      ];
    },
  });
}

export default function EditorPage({ theme, toggleTheme }) {
  const nav = useNavigate();
  const { id } = useParams();
  const idNum = useMemo(() => (id ? Number(id) : null), [id]);

  const { toast, show } = useToast();

  // debug
  const [loadingReason, setLoadingReason] = useState("init");

  // Auth
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
        show("🚫 관리자 계정이 아니에요.", 2600);
        await signOut(auth);
      } else {
        show("✅ 관리자 로그인 완료!", 1600);
      }
    } catch (e) {
      console.error(e);
      show("😵 로그인 실패", 2200);
    }
  }

  async function adminLogout() {
    try {
      await signOut(auth);
      show("👋 로그아웃!", 1400);
    } catch (e) {
      console.error(e);
      show("😵 로그아웃 실패", 2000);
    }
  }

  const UploadHandler = useMemo(() => makeUploadHandler(), []);

  const extensions = useMemo(
    () => [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: "Write… (노션처럼 + 버튼으로 블록 추가 가능) ✍️" }),

      TextStyle,
      Color,

      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      Youtube.configure({ controls: true, nocookie: true }),

      Scene,
      StickyStory,
      ParallaxImage,
      UfImage,

      UploadHandler,
    ],
    [UploadHandler]
  );

  const editor = useEditor({
    extensions,
    content: "",
    editorProps: { attributes: { class: "ProseMirror" } },
  });

  // Form state
  const [loading, setLoading] = useState(true);
  const [firebaseId, setFirebaseId] = useState(null);
  const [drafts, setDrafts] = useState([]);

  const [form, setForm] = useState({
    id: "",
    title: "",
    category: CATEGORY_OPTIONS[0],
    excerpt: "",
    tagsText: "",
    cover: "",
    coverThumb: "",
    coverMedium: "",
    status: "published",
    createdAt: null,
  });

  // Upload UI state
  const [uploading, setUploading] = useState(false);
  const [uploadP, setUploadP] = useState(0);
  const [lastFailedFile, setLastFailedFile] = useState(null);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);

  // Unsaved changes
  const [dirty, setDirty] = useState(false);

  const insertUfImageFromFile = useCallback(
    async (file, defaultSize = "medium") => {
      if (!file || !editor) return;

      try {
        setUploading(true);
        setUploadP(0);
        setLastFailedFile(null);
        show("🖼️ 업로드 시작…", 1200);

        const res = await uploadImage(file, { onProgress: (p) => setUploadP(p) });

        editor
          .chain()
          .focus()
          .insertContent({
            type: "ufImage",
            attrs: { src: res.url, caption: "", size: defaultSize },
          })
          .run();

        setDirty(true);
        show("✅ 이미지 삽입!", 1400);
      } catch (e) {
        console.error(e);
        setLastFailedFile(file);
        show("😵 이미지 업로드 실패 (재시도 가능)", 2600);
      } finally {
        setUploading(false);
        setTimeout(() => setUploadP(0), 400);
      }
    },
    [editor, show]
  );

  useEffect(() => {
    window.__UF_UPLOAD_IMAGE__ = (file) => insertUfImageFromFile(file, "medium");
    return () => {
      delete window.__UF_UPLOAD_IMAGE__;
    };
  }, [insertUfImageFromFile]);

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => setDirty(true);
    editor.on("update", onUpdate);
    return () => editor.off("update", onUpdate);
  }, [editor]);

  useEffect(() => {
    if (!loading) setDirty(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.title, form.excerpt, form.category, form.tagsText, form.cover, form.coverMedium]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function safeNav(to) {
    if (dirty && !window.confirm("저장되지 않은 변경사항이 있어요. 이동할까요?")) return;
    nav(to);
  }

  /** ✅ FIX: show가 이제 안정적이라 effect가 루프 돌지 않음 */
  useEffect(() => {
    if (!editor) {
      setLoadingReason("waiting editor");
      return;
    }
    if (!adminOk) {
      setLoadingReason("waiting admin");
      return;
    }

    let alive = true;

    (async () => {
      try {
        setLoading(true);

        if (idNum) {
          setLoadingReason("loading article");
          let a = null;
          try {
            a = await withTimeout(getArticleByIdNumber(idNum), 7000, "getArticle timeout");
          } catch (e) {
            console.warn("getArticleByIdNumber failed:", e?.message || e);
            show("⚠️ 글을 못 불러와서 빈 에디터로 열었어요.", 2800);
          }
          if (!alive) return;

          if (a) {
            setFirebaseId(a.firebaseId || a._firebaseId || null);
            setForm({
              id: String(a.id ?? ""),
              title: a.title ?? "",
              category: a.category ?? CATEGORY_OPTIONS[0],
              excerpt: a.excerpt ?? "",
              tagsText: Array.isArray(a.tags) ? a.tags.join(", ") : "",
              cover: a.cover ?? "",
              coverThumb: "",
              coverMedium: a.coverMedium ?? "",
              status: a.status ?? "published",
              createdAt: a.createdAt ?? null,
            });

            editor.commands.setContent(a.contentHTML || "");
            setDirty(false);
            show("🛠️ 글을 불러왔어요!", 1400);
          } else {
            setFirebaseId(null);
            setForm((p) => ({
              ...p,
              id: String(idNum),
              title: "",
              excerpt: "",
              tagsText: "",
              cover: "",
              coverThumb: "",
              coverMedium: "",
              status: "published",
              createdAt: null,
            }));
            editor.commands.setContent({ type: "doc", content: [{ type: "scene", content: [{ type: "paragraph" }] }] });
            setDirty(false);
          }
        } else {
          setLoadingReason("loading nextId");
          let nextId;
          try {
            nextId = await withTimeout(getNextArticleId(), 7000, "getNextId timeout");
          } catch (e) {
            console.warn("getNextArticleId failed:", e?.message || e);
            nextId = Number(String(Date.now()).slice(-6));
            show("⚠️ nextId를 못 가져와 임시 ID로 시작했어요.", 3000);
          }
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

          editor.commands.setContent({
            type: "doc",
            content: [
              { type: "scene", content: [{ type: "paragraph", content: [{ type: "text", text: "첫 Scene을 작성해보세요 ✨" }] }] },
              { type: "horizontalRule" },
              { type: "scene", content: [{ type: "paragraph", content: [{ type: "text", text: "여기는 두 번째 장면입니다." }] }] },
            ],
          });

          setDirty(false);
          show("✨ 새 글 시작!", 1400);
        }

        setLoadingReason("loading drafts");
        try {
          const d = await withTimeout(listDraftArticles?.() ?? Promise.resolve([]), 7000, "drafts timeout");
          if (!alive) return;
          setDrafts(Array.isArray(d) ? d : []);
        } catch {
          setDrafts([]);
        }

        setLoadingReason("ready");
      } catch (e) {
        console.error(e);
        setLoadingReason("error");
        show("😵 에디터 로딩 오류", 2400);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [editor, adminOk, idNum, show]); // ✅ show 안정화됨

  async function onPickCover(file) {
    if (!file) return;
    try {
      setUploading(true);
      setUploadP(0);
      setLastFailedFile(null);
      show("🖼️ 커버 업로드…", 1400);

      const res = await uploadImage(file, { onProgress: (p) => setUploadP(p) });

      setForm((p) => ({
        ...p,
        cover: res.url || "",
        coverThumb: "",
        coverMedium: res.mediumUrl || res.url || "",
      }));

      setDirty(true);
      show("✅ 커버 업로드 완료!", 1400);
    } catch (e) {
      console.error(e);
      setLastFailedFile(file);
      show("😵 커버 업로드 실패", 2400);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadP(0), 400);
    }
  }

  function onCoverInput(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onPickCover(f);
  }

  async function onPickBodyImage(file) {
    return insertUfImageFromFile(file, "medium");
  }

  function validateBeforePublish() {
    const title = form.title.trim();
    const html = editor?.getHTML() || "";
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    if (!title) return "✍️ 제목을 입력해주세요.";
    if (!form.cover && !form.coverMedium) return "🖼️ 커버 이미지를 업로드해주세요.";
    if (text.length < 40) return "📝 본문이 너무 짧아요. (최소 40자 권장)";
    return null;
  }

  async function onSave(statusType) {
    if (!editor) return;

    const idVal = Number(form.id);
    const title = form.title.trim();
    const excerpt = form.excerpt.trim();
    const tags = parseTags(form.tagsText);

    if (!idVal || Number.isNaN(idVal)) return show("😵 글 번호(id)가 이상해요.", 2200);
    if (!title) return show("✍️ 제목을 먼저 적어주세요!", 2200);

    if (statusType === "published") {
      const err = validateBeforePublish();
      if (err) return show(err, 2400);
    }

    try {
      const payload = {
        id: idVal,
        title,
        category: form.category,
        excerpt,
        status: statusType,
        contentHTML: editor.getHTML(),
        cover: form.cover || "",
        coverThumb: "",
        coverMedium: form.coverMedium || form.cover || "",
        tags,
        createdAt: form.createdAt ?? null,
      };

      if (!idNum) {
        show(statusType === "draft" ? "📝 드래프트 저장…" : "🚀 발행 중…", 1600);
        await createArticle(payload);
        setDirty(false);
        show(statusType === "draft" ? "✅ 드래프트 저장!" : "🎉 발행 완료!", 2000);
        if (statusType !== "draft") nav(`/article/${idVal}`);
      } else {
        if (!firebaseId) return show("😵 firebaseId가 없어요. 다시 열어주세요.", 2600);
        show("🛠️ 저장 중…", 1400);
        await updateArticle(firebaseId, payload);
        setDirty(false);
        show("✅ 저장 완료!", 1600);
        if (statusType !== "draft") nav(`/article/${idVal}`);
      }
    } catch (e) {
      console.error(e);
      show("😵 저장 오류", 2600);
    }
  }

  function openDraft(d) {
    if (!d?.id) return;
    safeNav(`/write/${d.id}`);
  }

  if (checkingAuth) {
    return <div className="uf-wrap" style={{ padding: "90px 16px" }}>확인 중… ⏳</div>;
  }

  if (!adminOk) {
    return (
      <div className="uf-page">
        {toast && <div className="uf-toast">{toast}</div>}
        <header className="uf-topbar">
          <div className="uf-wrap">
            <div className="uf-topbar__inner">
              <button className="uf-brand" type="button" onClick={() => nav("/")}>U#</button>
              <div className="uf-nav">
                <button className="uf-btn" onClick={toggleTheme}>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</button>
              </div>
            </div>
          </div>
        </header>

        <div className="uf-wrap" style={{ padding: "80px 16px" }}>
          <div className="uf-card uf-panel">
            <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>🔐 Admin Only</div>
            <div style={{ color: "var(--muted)", marginBottom: 16 }}>
              이 페이지는 관리자만 접근할 수 있어요.
            </div>
            <div className="uf-row" style={{ gap: 10, flexWrap: "wrap" }}>
              <button className="uf-btn uf-btn--primary" onClick={adminLogin}>Google로 로그인</button>
              <button className="uf-btn" onClick={() => nav("/")}>← 리스트로</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const previewHtml = editor?.getHTML() || "";
  const coverForPreview = form.coverMedium || form.cover || "";

  return (
    <div className="uf-page">
      {toast && <div className="uf-toast">{toast}</div>}

      <div style={{ position: "fixed", left: 10, bottom: 10, zIndex: 200, fontSize: 11, opacity: 0.55 }}>
        editor: {editor ? "ok" : "null"} · loading: {String(loading)} · reason: {loadingReason}
      </div>

      {uploading ? (
        <div style={{ position: "sticky", top: 0, zIndex: 120, background: "color-mix(in srgb, var(--panel) 85%, transparent)", borderBottom: "1px solid var(--line)", backdropFilter: "blur(10px)" }}>
          <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: "color-mix(in srgb, var(--line) 35%, transparent)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${uploadP}%`, background: "var(--brand)", transition: "width .08s linear" }} />
            </div>
            <div style={{ width: 56, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{uploadP}%</div>
            {lastFailedFile ? (
              <button className="uf-btn uf-btn--ghost" onClick={() => insertUfImageFromFile(lastFailedFile, "medium")}>
                Retry
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <header className="uf-topbar">
        <div className="uf-wrap">
          <div className="uf-topbar__inner">
            <button className="uf-brand" type="button" onClick={() => safeNav("/")}>U#</button>
            <div className="uf-nav">
              <button className="uf-btn uf-btn--ghost" onClick={() => safeNav("/")}>Archive</button>
              <button className="uf-btn" onClick={toggleTheme}>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</button>
              <button className="uf-btn uf-btn--ghost" onClick={() => setPreviewOpen(true)}>👁 Preview</button>
              <button className="uf-btn uf-btn--ghost" onClick={adminLogout}>Logout</button>
            </div>
          </div>
        </div>
      </header>

      <div className="uf-toolbar">
        <div className="uf-wrap">
          <div className="uf-toolbar__inner">
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBold().run()}>B</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleItalic().run()}>I</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleUnderline().run()}>U</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleHighlight().run()}>🖍</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>⬅</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>↔</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>➡</button>

            <div className="uf-colorRow">
              {["#111827", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"].map((c) => (
                <button key={c} type="button" className="uf-colorDot" style={{ background: c }} onClick={() => editor?.chain().focus().setColor(c).run()} title={c} />
              ))}
              <button className="uf-btn" onClick={() => editor?.chain().focus().unsetColor().run()} title="색 제거">×</button>
            </div>

            <button className="uf-btn" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>❝ Quote</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>— SceneBreak</button>

            <button
              className="uf-btn"
              onClick={() => {
                const prev = editor?.getAttributes("link")?.href || "";
                const url = window.prompt("링크 URL", prev || "https://");
                if (url === null) return;
                if (url.trim() === "") {
                  editor?.chain().focus().unsetLink().run();
                  show("🔗 링크 제거", 1400);
                  return;
                }
                editor?.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
                show("🔗 링크 설정", 1400);
              }}
            >
              🔗 Link
            </button>

            <button className="uf-btn" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              ▦ Table
            </button>

            <button className="uf-btn" onClick={() => {
              const url = window.prompt("YouTube URL", "https://www.youtube.com/watch?v=");
              if (!url) return;
              editor?.chain().focus().setYoutubeVideo({ src: url }).run();
            }}>
              ▶ YouTube
            </button>

            <button className="uf-btn" onClick={() => editor?.chain().focus().insertContent({ type: "scene", content: [{ type: "paragraph" }] }).run()}>
              + Scene
            </button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().insertContent({ type: "stickyStory", attrs: { src: "", caption: "" }, content: [{ type: "paragraph" }] }).run()}>
              + Sticky
            </button>
            <button className="uf-btn" onClick={() => {
              const url = window.prompt("Parallax Image URL", "https://");
              if (!url) return;
              editor?.chain().focus().insertContent({ type: "parallaxImage", attrs: { src: url, speed: 0.18 } }).run();
            }}>
              + Parallax
            </button>

            <label className="uf-btn" style={{ cursor: "pointer" }}>
              🖼 Upload
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) onPickBodyImage(f);
              }} />
            </label>

            <button className="uf-btn" onClick={() => editor?.chain().focus().undo().run()}>↶</button>
            <button className="uf-btn" onClick={() => editor?.chain().focus().redo().run()}>↷</button>
          </div>
        </div>
      </div>

      <div className="uf-editorShell">
        <div className="uf-wrap">
          {loading || !editor ? (
            <div style={{ padding: "30px 0" }}>로딩 중… ⏳</div>
          ) : (
            <div className="uf-editorGrid">
              <aside className="uf-card uf-panel">
                <div className="uf-panelTitle">Meta</div>

                {drafts?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="uf-label">Drafts</div>
                    <div className="uf-stack" style={{ gap: 8 }}>
                      {drafts.slice(0, 8).map((d) => (
                        <button key={d.id} className="uf-btn uf-btn--ghost" onClick={() => openDraft(d)}>
                          No.{d.id} — {d.title || "(no title)"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">ID</div>
                  <input className="uf-input" value={form.id} disabled={!!idNum} onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))} />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">Title</div>
                  <input className="uf-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="제목" />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">Category</div>
                  <select className="uf-select" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">Excerpt</div>
                  <textarea className="uf-textarea" value={form.excerpt} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} placeholder="리스트 카드 요약" />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div className="uf-label">Tags (comma)</div>
                  <input className="uf-input" value={form.tagsText} onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))} placeholder="예: 전시, 인사동, 언프레임" />
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div className="uf-label">Cover</div>
                  <div className="uf-row" style={{ flexWrap: "wrap" }}>
                    <label className="uf-btn uf-btn--primary" style={{ cursor: "pointer" }}>
                      Upload Cover
                      <input type="file" accept="image/*" onChange={onCoverInput} style={{ display: "none" }} />
                    </label>
                    {(form.cover || form.coverMedium) ? (
                      <button className="uf-btn" onClick={() => setForm((p) => ({ ...p, cover: "", coverThumb: "", coverMedium: "" }))}>
                        Remove
                      </button>
                    ) : null}
                  </div>

                  {(form.cover || form.coverMedium) ? (
                    <div style={{ marginTop: 10 }}>
                      <img src={form.coverMedium || form.cover} alt="cover" style={{ width: "100%", borderRadius: 14, border: "1px solid var(--line)" }} />
                    </div>
                  ) : (
                    <div className="uf-panelHint">커버가 있으면 리스트/뷰에서 훨씬 고급스럽게 보여요 ✨</div>
                  )}
                </div>

                <div className="uf-stack" style={{ marginTop: 12 }}>
                  <button className="uf-btn" onClick={() => onSave("draft")}>📝 Save Draft</button>
                  <button className="uf-btn uf-btn--primary" onClick={() => onSave("published")}>🚀 Publish</button>
                </div>

                <div className="uf-panelHint">
                  ✅ 이미지: <b>붙여넣기(Cmd+V)</b> / <b>드래그&드롭</b> / <b>Upload</b>
                  <br />✅ 왼쪽 <b>+</b> 메뉴로 블록 추가
                </div>
              </aside>

              <section className="uf-card uf-editorBox" style={{ position: "relative" }}>
                <BlockPlusMenu editor={editor} onPickImage={onPickBodyImage} />
                <EditorContent editor={editor} />
              </section>
            </div>
          )}
        </div>
      </div>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={form.title}
        category={form.category}
        cover={coverForPreview}
        excerpt={form.excerpt}
        html={previewHtml}
      />
    </div>
  );
}
