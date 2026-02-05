import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";

import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

import {
  getArticleByIdNumber,
  getNextArticleId,
  createArticle,
  updateArticle,
  listDraftArticles,
} from "../services/articles";

import { uploadImage } from "../services/upload";
import { getParam } from "../utils/router";

export default function EditorPage({ id }) {
  const idNum = useMemo(() => {
    const raw = id ?? getParam("id");
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [id]);

  const [user, setUser] = useState(null);

  // form state
  const [firebaseId, setFirebaseId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    id: "",
    title: "",
    category: "Exhibition",
    excerpt: "",
    tagsText: "",
    status: "published",
    cover: "",
    coverThumb: "",
    createdAt: null,
  });

  const [drafts, setDrafts] = useState([]);

  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // ---------------------------
  // TipTap editor
  // ---------------------------
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Write something..." }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "ProseMirror prose prose-lg max-w-none focus:outline-none min-h-[450px] p-6",
      },

      // ✅ 드래그&드롭 이미지 업로드
      handleDrop: (view, event, _slice, _moved) => {
        const dt = event.dataTransfer;
        if (!dt?.files?.length) return false;

        const file = dt.files[0];
        if (!file || !file.type.startsWith("image/")) return false;

        event.preventDefault();
        (async () => {
          try {
            const { url } = await uploadImage(file);
            if (!url) throw new Error("uploadImage returned empty url");
            editor?.chain().focus().setImage({ src: url }).run();
          } catch (e) {
            console.error(e);
            alert("이미지 업로드 실패(드롭)");
          }
        })();

        return true;
      },

      // ✅ 붙여넣기 이미지 업로드 (스크린샷 붙여넣기 포함)
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items?.length) return false;

        const fileItem = Array.from(items).find(
          (it) => it.kind === "file" && it.type.startsWith("image/")
        );
        if (!fileItem) return false;

        const file = fileItem.getAsFile();
        if (!file) return false;

        event.preventDefault();
        (async () => {
          try {
            const { url } = await uploadImage(file);
            if (!url) throw new Error("uploadImage returned empty url");
            editor?.chain().focus().setImage({ src: url }).run();
          } catch (e) {
            console.error(e);
            alert("이미지 업로드 실패(붙여넣기)");
          }
        })();

        return true;
      },
    },
  });

  // ---------------------------
  // Auth
  // ---------------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // ---------------------------
  // Load article / init new
  // ---------------------------
  useEffect(() => {
    (async () => {
      if (!editor) return;

      setLoading(true);
      try {
        // drafts sidebar
        try {
          const d = await listDraftArticles?.();
          if (Array.isArray(d)) setDrafts(d);
        } catch (e) {
          // drafts는 선택기능이라 실패해도 에디터는 돌아가게
          console.warn("draft list skipped:", e);
        }

        if (idNum) {
          const a = await getArticleByIdNumber(idNum);
          if (!a) {
            alert("글을 찾지 못했어.");
            setLoading(false);
            return;
          }

          setFirebaseId(a.firebaseId);
          setForm({
            id: String(a.id ?? ""),
            title: a.title ?? "",
            category: a.category ?? "Exhibition",
            excerpt: a.excerpt ?? "",
            tagsText: Array.isArray(a.tags) ? a.tags.join(", ") : "",
            status: a.status ?? "published",
            cover: a.cover ?? "",
            coverThumb: a.coverThumb ?? "",
            createdAt: a.createdAt ?? null,
          });

          editor.commands.setContent(a.contentHTML ?? "");
        } else {
          // new article
          const nextId = await getNextArticleId();
          setForm((p) => ({ ...p, id: String(nextId) }));
          editor.commands.setContent("");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [editor, idNum]);

  // ---------------------------
  // Helpers
  // ---------------------------
  const tags = useMemo(() => {
    const raw = form.tagsText || "";
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [form.tagsText]);

  const setField = (key) => (e) => {
    setForm((p) => ({ ...p, [key]: e.target.value }));
  };

  // ---------------------------
  // Uploads
  // ---------------------------
  const handleCoverPick = () => coverInputRef.current?.click();

  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setSaving(true);
      // uploadImage가 { url, thumbUrl }를 주면 둘 다 사용
      const res = await uploadImage(file);
      const coverUrl = res?.url;
      const thumb = res?.thumbUrl || res?.thumb || "";

      if (!coverUrl) throw new Error("cover upload empty url");

      setForm((p) => ({
        ...p,
        cover: coverUrl,
        coverThumb: thumb || p.coverThumb || "",
      }));
    } catch (err) {
      console.error(err);
      alert("커버 업로드 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleBodyImagePick = () => fileInputRef.current?.click();

  const handleBodyImageChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setSaving(true);
      const { url } = await uploadImage(file);
      if (!url) throw new Error("body upload empty url");
      editor?.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error(err);
      alert("본문 이미지 업로드 실패");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------
  // Toolbar actions
  // ---------------------------
  const toggleLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href || "";
    const url = prompt("링크 URL을 입력하세요", prev);
    if (url === null) return;

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  // ---------------------------
  // Save / Publish
  // ---------------------------
  const save = async (statusType) => {
    if (!editor) return;
    if (!form.title.trim()) return alert("제목은 필수야.");

    const payloadBase = {
      id: Number(form.id),
      title: form.title.trim(),
      category: form.category,
      excerpt: form.excerpt.trim(),
      status: statusType,
      contentHTML: editor.getHTML(),
      cover: form.cover || "",
      coverThumb: form.coverThumb || "",
      tags,
    };

    try {
      setSaving(true);

      // 새 글: createdAt 세팅
      if (!firebaseId) {
        const payload = {
          ...payloadBase,
          createdAt: new Date(),
          likes: 0,
          views: 0,
        };
        const newId = await createArticle(payload);
        // createArticle가 firebaseId 반환하면 저장
        if (newId) setFirebaseId(newId);
        alert(statusType === "draft" ? "드래프트 저장 완료" : "발행 완료");
        if (statusType !== "draft") {
          window.location.href = `/?mode=view&id=${payload.id}`;
        } else {
          // draft list refresh
          try {
            const d = await listDraftArticles?.();
            if (Array.isArray(d)) setDrafts(d);
          } catch {}
        }
        return;
      }

      // 수정: createdAt 절대 유지
      const payload = {
        ...payloadBase,
        createdAt: form.createdAt ?? null,
      };

      await updateArticle(firebaseId, payload);

      alert(statusType === "draft" ? "드래프트 저장 완료" : "발행 완료");
      if (statusType !== "draft") {
        window.location.href = `/?mode=view&id=${payload.id}`;
      } else {
        try {
          const d = await listDraftArticles?.();
          if (Array.isArray(d)) setDrafts(d);
        } catch {}
      }
    } catch (err) {
      console.error(err);
      alert("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------
  // UI
  // ---------------------------
  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-10">
        <div className="max-w-xl w-full rounded-3xl border border-white/10 bg-white/5 p-10">
          <h1 className="text-4xl font-black tracking-tight mb-3">
            UNFRAME Editor
          </h1>
          <p className="text-white/60 mb-8">
            관리자 로그인 후 작성할 수 있어요.
          </p>
          <button
            onClick={handleLogin}
            className="px-6 py-3 rounded-full bg-white text-black font-bold hover:opacity-90"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (!editor) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/?mode=list"
              className="text-xs px-3 py-2 rounded-full border border-white/15 hover:bg-white/10"
            >
              ← Back
            </a>
            <div className="text-sm text-white/70">
              Logged in as{" "}
              <span className="text-white font-semibold">{user.email}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-2 rounded-full border border-white/15 hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        {/* Main */}
        <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-28">
                <div className="text-[10px] text-white/50 mb-1">NO.</div>
                <input
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10"
                  value={form.id}
                  readOnly
                />
              </div>

              <div className="flex-1 min-w-[220px]">
                <div className="text-[10px] text-white/50 mb-1">CATEGORY</div>
                <select
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10"
                  value={form.category}
                  onChange={setField("category")}
                >
                  <option>Exhibition</option>
                  <option>Project</option>
                  <option>Artist Note</option>
                  <option>News</option>
                </select>
              </div>

              <div className="flex-1 min-w-[220px]">
                <div className="text-[10px] text-white/50 mb-1">STATUS</div>
                <select
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10"
                  value={form.status}
                  onChange={setField("status")}
                >
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                </select>
              </div>
            </div>

            <input
              className="mt-6 w-full text-4xl font-black tracking-tight bg-transparent outline-none placeholder:text-white/20"
              placeholder="Title"
              value={form.title}
              onChange={setField("title")}
            />
            <input
              className="mt-3 w-full text-lg text-white/70 bg-transparent outline-none placeholder:text-white/20"
              placeholder="Excerpt"
              value={form.excerpt}
              onChange={setField("excerpt")}
            />
            <input
              className="mt-4 w-full text-sm text-white/60 bg-black/30 border border-white/10 rounded-xl px-4 py-3 outline-none"
              placeholder="tags: test, 전시, 인사동, 언프레임 (콤마로 구분)"
              value={form.tagsText}
              onChange={setField("tagsText")}
            />
          </div>

          {/* Cover */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] tracking-[0.3em] text-white/50">
                  COVER IMAGE
                </div>
                <div className="text-sm text-white/70 mt-1">
                  커버 업로드하면 미리보기가 떠요.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverChange}
                />
                <button
                  onClick={handleCoverPick}
                  className="px-5 py-2 rounded-full bg-white text-black font-bold hover:opacity-90"
                  disabled={saving}
                >
                  Upload Cover
                </button>
              </div>
            </div>

            {form.cover ? (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                <img
                  src={form.coverThumb || form.cover}
                  alt="cover"
                  className="w-full h-[260px] object-cover"
                />
              </div>
            ) : (
              <div className="h-[260px] rounded-2xl border border-dashed border-white/15 bg-black/20 flex items-center justify-center text-white/30">
                No cover yet
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-white/10 bg-black/20">
            <div className="flex flex-wrap gap-2">
              <button
                className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                Bold
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                Italic
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                H2
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                onClick={() => editor.chain().focus().setTextAlign("left").run()}
              >
                Left
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                onClick={() => editor.chain().focus().setTextAlign("center").run()}
              >
                Center
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                onClick={() => editor.chain().focus().setTextAlign("right").run()}
              >
                Right
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                onClick={toggleLink}
              >
                Link
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBodyImageChange}
              />
              <button
                className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                onClick={handleBodyImagePick}
                disabled={saving}
              >
                Upload Image
              </button>

              <div className="w-px bg-white/10 mx-1" />

              <button
                className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                onClick={() => editor.chain().focus().undo().run()}
              >
                Undo
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10"
                onClick={() => editor.chain().focus().redo().run()}
              >
                Redo
              </button>
            </div>

            <div className="mt-3 text-xs text-white/40">
              ✅ 본문 이미지: 버튼 업로드 / 드래그&드롭 / 붙여넣기 모두 지원
            </div>
          </div>

          {/* Editor */}
          <div className="bg-white text-black">
            <EditorContent editor={editor} />
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-white/10 bg-neutral-950">
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={() => save("draft")}
                disabled={saving || loading}
                className="px-6 py-3 rounded-full border border-white/15 hover:bg-white/10 disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                onClick={() => save("published")}
                disabled={saving || loading}
                className="px-7 py-3 rounded-full bg-white text-black font-bold hover:opacity-90 disabled:opacity-50"
              >
                Publish
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar: Drafts */}
        <aside className="rounded-3xl border border-white/10 bg-white/5 p-6 h-fit sticky top-24">
          <div className="text-[10px] tracking-[0.3em] text-white/50 mb-4">
            DRAFTS
          </div>

          {drafts?.length ? (
            <div className="space-y-3">
              {drafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    const ok = confirm("이 드래프트를 불러올까?");
                    if (!ok) return;
                    window.location.href = `/?mode=editor&id=${d.id}`;
                  }}
                  className="w-full text-left rounded-2xl border border-white/10 bg-black/20 hover:bg-white/10 p-4"
                >
                  <div className="font-bold truncate">{d.title || "(No title)"}</div>
                  <div className="text-xs text-white/40 mt-1">
                    No.{d.id} • {d.category || "—"}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/30">No drafts found.</div>
          )}

          <div className="mt-6 pt-6 border-t border-white/10">
            <a
              href="/?mode=list"
              className="block text-center px-4 py-3 rounded-2xl border border-white/15 hover:bg-white/10 text-sm"
            >
              Go to List
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
