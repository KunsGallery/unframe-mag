// src/pages/EditorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";

import { getParam, go } from "../utils/router";
import {
  getNextArticleId,
  getArticleByIdNumber,
  createArticle,
  updateArticle,
  listDraftArticles,
} from "../services/articles";
import { uploadImage } from "../services/upload";

function parseTags(text) {
  return String(text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}

export default function EditorPage() {
  const idNum = useMemo(() => Number(getParam("id") || 0), []);
  const fileRef = useRef(null);
  const coverRef = useRef(null);

  const [firebaseId, setFirebaseId] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    id: "",
    title: "",
    category: "Exhibition",
    excerpt: "",
    tagsText: "",
    cover: "",
    status: "published",
    createdAt: null,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Write something…" }),
    ],
    content: "",
    editorProps: {
      // ✅ 드래그&드롭 업로드
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        const img = files.find((f) => f.type.startsWith("image/"));
        if (!img) return false;

        event.preventDefault();
        (async () => {
          try {
            const { url } = await uploadImage(img);
            editor.chain().focus().setImage({ src: url }).run();
          } catch (e) {
            console.error(e);
            alert("드래그 이미지 업로드 실패");
          }
        })();

        return true;
      },

      // ✅ 붙여넣기 업로드(스크린샷)
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imgItem = items.find((i) => i.type?.startsWith("image/"));
        if (!imgItem) return false;

        event.preventDefault();
        const file = imgItem.getAsFile();
        if (!file) return false;

        (async () => {
          try {
            const { url } = await uploadImage(file);
            editor.chain().focus().setImage({ src: url }).run();
          } catch (e) {
            console.error(e);
            alert("붙여넣기 이미지 업로드 실패");
          }
        })();

        return true;
      },
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const d = await listDraftArticles();
        setDrafts(d);
      } catch {
        setDrafts([]);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!editor) return;

      if (idNum) {
        const a = await getArticleByIdNumber(idNum);
        if (!a) return alert("글을 찾지 못했어.");

        setFirebaseId(a.firebaseId);
        setForm({
          id: String(a.id || ""),
          title: a.title || "",
          category: a.category || "Exhibition",
          excerpt: a.excerpt || "",
          tagsText: Array.isArray(a.tags) ? a.tags.join(", ") : "",
          cover: a.cover || "",
          status: a.status || "published",
          createdAt: a.createdAt || null,
        });
        editor.commands.setContent(a.contentHTML || "");
      } else {
        const nextId = await getNextArticleId();
        setForm((p) => ({ ...p, id: String(nextId) }));
        editor.commands.setContent("");
      }
    })();
  }, [editor, idNum]);

  const insert2Col = () => {
    editor
      ?.chain()
      .focus()
      .insertContent(
        `<div class="uf-cols uf-cols-2">
          <div class="uf-col"><p>Column 1</p></div>
          <div class="uf-col"><p>Column 2</p></div>
        </div><p></p>`
      )
      .run();
  };

  const insert3Col = () => {
    editor
      ?.chain()
      .focus()
      .insertContent(
        `<div class="uf-cols uf-cols-3">
          <div class="uf-col"><p>Column 1</p></div>
          <div class="uf-col"><p>Column 2</p></div>
          <div class="uf-col"><p>Column 3</p></div>
        </div><p></p>`
      )
      .run();
  };

  const onPickBodyImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setBusy(true);
      const { url } = await uploadImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (e2) {
      console.error(e2);
      alert("본문 이미지 업로드 실패");
    } finally {
      setBusy(false);
    }
  };

  const onPickCover = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      setBusy(true);
      const { url } = await uploadImage(file);
      setForm((p) => ({ ...p, cover: url }));
    } catch (e2) {
      console.error(e2);
      alert("커버 업로드 실패");
    } finally {
      setBusy(false);
    }
  };

  const save = async (statusType) => {
    if (!editor) return;
    if (!form.title.trim()) return alert("제목은 필수야.");

    const tags = parseTags(form.tagsText);

    try {
      setBusy(true);

      if (!firebaseId) {
        // ✅ 신규 생성 (createdAt 세팅)
        const payload = {
          id: Number(form.id),
          title: form.title.trim(),
          category: form.category,
          excerpt: form.excerpt.trim(),
          status: statusType,
          contentHTML: editor.getHTML(),
          cover: form.cover || "",
          tags,
          createdAt: new Date(),
          likes: 0,
          views: 0,
        };

        const newFirebaseId = await createArticle(payload);
        setFirebaseId(newFirebaseId);

        alert(statusType === "published" ? "발행 완료!" : "드래프트 저장!");
        if (statusType === "published") go(`?mode=view&id=${payload.id}`);
        return;
      }

      // ✅ 수정 (createdAt/likes/views는 건드리지 않음)
      const updatePayload = {
        id: Number(form.id),
        title: form.title.trim(),
        category: form.category,
        excerpt: form.excerpt.trim(),
        status: statusType,
        contentHTML: editor.getHTML(),
        cover: form.cover || "",
        tags,
      };

      await updateArticle(firebaseId, updatePayload);

      alert("저장 완료!");
      go(`?mode=view&id=${form.id}`);
    } catch (e) {
      console.error(e);
      alert("저장 실패");
    } finally {
      setBusy(false);
    }
  };

  if (!editor) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* 상단 툴바 */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/90 backdrop-blur px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" onClick={() => editor.chain().focus().toggleBold().run()}>
            Bold
          </button>
          <button className="btn" onClick={() => editor.chain().focus().toggleItalic().run()}>
            Italic
          </button>
          <button className="btn" onClick={() => editor.chain().focus().setTextAlign("left").run()}>
            Left
          </button>
          <button
            className="btn"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            Center
          </button>
          <button
            className="btn"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            Right
          </button>
          <button className="btn" onClick={insert2Col}>
            2 Col
          </button>
          <button className="btn" onClick={insert3Col}>
            3 Col
          </button>

          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickBodyImage} />
          <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            Upload Image
          </button>

          <div className="ml-auto flex gap-2">
            <button className="btn2" onClick={() => save("draft")} disabled={busy}>
              Save Draft
            </button>
            <button className="btnPrimary" onClick={() => save("published")} disabled={busy}>
              Publish
            </button>
            <button className="btn" onClick={() => go("?mode=list")} disabled={busy}>
              Exit
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* 본문 */}
        <div className="bg-neutral-900/40 border border-white/10 rounded-2xl overflow-hidden">
          {/* 메타 입력 */}
          <div className="p-6 border-b border-white/10 space-y-4">
            <div className="flex gap-3 items-center">
              <div className="text-sm text-white/60">NO.</div>
              <input className="inp w-28" value={form.id} readOnly />
              <select
                className="inp flex-1"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              >
                {["Exhibition", "Project", "Artist Note", "News"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <input
              className="inp text-2xl font-bold"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            />
            <input
              className="inp"
              placeholder="Excerpt"
              value={form.excerpt}
              onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
            />
            <input
              className="inp"
              placeholder="Tags (comma separated)"
              value={form.tagsText}
              onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
            />

            <div className="flex gap-3 items-center">
              <input ref={coverRef} type="file" accept="image/*" hidden onChange={onPickCover} />
              <button className="btn" onClick={() => coverRef.current?.click()} disabled={busy}>
                Cover Upload
              </button>
              {form.cover ? (
                <img
                  src={form.cover}
                  alt=""
                  className="h-12 w-20 rounded-lg object-cover border border-white/10"
                />
              ) : (
                <div className="text-sm text-white/50">커버 업로드하면 미리보기가 떠.</div>
              )}
            </div>
          </div>

          {/* 에디터 */}
          <div className="p-6">
            <div className="uf-editor prose prose-invert max-w-none">
              <EditorContent editor={editor} />
            </div>
            <div className="text-xs text-white/40 mt-3">
              ✅ 이미지: 버튼 업로드 / 드래그&드롭 / 붙여넣기 가능
            </div>
          </div>
        </div>

        {/* 드래프트 사이드바 */}
        <aside className="bg-neutral-900/40 border border-white/10 rounded-2xl p-4 h-fit sticky top-24">
          <div className="text-sm font-bold mb-3">Draft Articles</div>
          {drafts.length === 0 ? (
            <div className="text-sm text-white/40">No drafts</div>
          ) : (
            <div className="space-y-2">
              {drafts.map((d) => (
                <button
                  key={d.firebaseId}
                  className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 transition"
                  onClick={() => go(`?mode=editor&id=${d.id}`)}
                >
                  <div className="font-semibold text-sm truncate">{d.title || "(No title)"}</div>
                  <div className="text-xs text-white/40">No.{d.id}</div>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      <style>{`
        .btn{padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06)}
        .btn:hover{background:rgba(255,255,255,.1)}
        .btn2{padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06)}
        .btnPrimary{padding:8px 12px;border-radius:10px;background:#2563eb}
        .btnPrimary:hover{background:#1d4ed8}
        .inp{width:100%;padding:12px 12px;border-radius:12px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);outline:none}
        .inp:focus{border-color:rgba(37,99,235,.8)}
      `}</style>
    </div>
  );
}
