import React, { useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";

import { go } from "../utils/router";
import { getArticleByIdNumber, getNextArticleId, upsertArticle } from "../services/articles";
import { uploadFile } from "../services/upload";
import { makeCoverVariants } from "../utils/image";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

function normalizeTags(raw) {
  return (raw || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.replace(/^#/, ""));
}

export default function EditorPage({ id }) {
  const [user, setUser] = useState(null);

  const [firebaseId, setFirebaseId] = useState(null);
  const [form, setForm] = useState({
    id: "",
    title: "",
    category: "Exhibition",
    excerpt: "",
    tagsText: "",
    cover: "",
    coverThumb: "",
    status: "published",
    createdAt: null,
  });

  const idNum = useMemo(() => Number(id || 0), [id]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Write something…" }),
    ],
    content: "",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
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
          coverThumb: a.coverThumb || "",
          status: a.status || "published",
          createdAt: a.createdAt || null,
        });
        editor.commands.setContent(a.contentHTML || "");
      } else {
        // 새 글
        const nextId = await getNextArticleId();
        setForm((p) => ({ ...p, id: String(nextId) }));
        editor.commands.setContent("");
      }
    })();
  }, [editor, idNum]);

  const login = async () => {
    await signInWithPopup(auth, googleProvider);
  };
  const logout = async () => {
    await signOut(auth);
  };

  const uploadCover = async (file) => {
    // ✅ 큰 파일이면 자동 압축 + full/thumb 2장 생성
    const { full, thumb } = await makeCoverVariants(file);

    const [fullUrl, thumbUrl] = await Promise.all([uploadFile(full), uploadFile(thumb)]);

    setForm((p) => ({ ...p, cover: fullUrl, coverThumb: thumbUrl }));
  };

  const uploadInlineImage = async (file) => {
    // 본문 이미지는 2~3MB 정도로만
    const { full } = await makeCoverVariants(file);
    const url = await uploadFile(full);
    editor.chain().focus().setImage({ src: url }).run();
  };

  const save = async (statusType) => {
    if (!user) return alert("관리자 로그인 후 작성 가능해.");
    if (!form.title.trim()) return alert("제목은 필수야.");
    if (!editor) return alert("에디터가 아직 준비 안 됐어.");

    const tags = normalizeTags(form.tagsText);

    const payload = {
      id: Number(form.id),
      title: form.title.trim(),
      category: form.category,
      excerpt: form.excerpt.trim(),
      status: statusType,
      contentHTML: editor.getHTML(),

      cover: form.cover || "",
      coverThumb: form.coverThumb || "",
      tags,

      // createdAt은 신규 때만 넣고, 수정 때는 upsertArticle에서 보존 처리됨
      createdAt: form.createdAt ?? null,
    };

    const res = await upsertArticle({ firebaseId, payload });
    setFirebaseId(res.firebaseId);

    alert(statusType === "published" ? "발행 완료!" : "드래프트 저장!");
    go(`?mode=view&id=${payload.id}`);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs tracking-[0.35em] uppercase text-white/50">UNFRAME Editor</div>
            <div className="text-white/80 text-sm mt-2">
              {user ? (
                <>
                  <span className="font-bold">{user.email}</span> ·{" "}
                  <button onClick={logout} className="underline">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  관리자 로그인 후 작성할 수 있어요.{" "}
                  <button onClick={login} className="underline">
                    Sign in with Google
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => go("?mode=list")}
              className="px-4 py-2 rounded-full border border-white/15 hover:bg-white hover:text-black transition"
            >
              List
            </button>
            <button
              onClick={() => save("draft")}
              className="px-5 py-2 rounded-full bg-white/10 border border-white/15 hover:bg-white hover:text-black transition font-bold"
            >
              Save Draft
            </button>
            <button
              onClick={() => save("published")}
              className="px-6 py-2 rounded-full bg-white text-black font-bold hover:opacity-90"
            >
              Publish
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs tracking-widest text-white/50 mb-2">NO.</div>
              <input
                value={form.id}
                onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs tracking-widest text-white/50 mb-2">CATEGORY</div>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
              >
                <option>Exhibition</option>
                <option>Project</option>
                <option>Artist Note</option>
                <option>News</option>
              </select>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs tracking-widest text-white/50 mb-2">TAGS</div>
              <input
                value={form.tagsText}
                onChange={(e) => setForm((p) => ({ ...p, tagsText: e.target.value }))}
                placeholder="예: unframe, 전시, 인사동"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
              />
              <div className="text-xs text-white/40 mt-2">쉼표(,)로 구분</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs tracking-widest text-white/50 mb-3">COVER IMAGE</div>
              <label className="inline-flex items-center gap-3 cursor-pointer">
                <span className="px-4 py-2 rounded-full bg-white text-black font-bold">
                  Upload Cover
                </span>
                <span className="text-white/50 text-sm">커버 업로드하면 미리보기가 떠요.</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      await uploadCover(f);
                    } catch (err) {
                      console.error(err);
                      alert("커버 업로드 실패");
                    }
                  }}
                />
              </label>

              {form.coverThumb || form.cover ? (
                <div className="mt-4 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                  <img
                    src={form.coverThumb || form.cover}
                    alt=""
                    className="w-full h-auto"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="md:col-span-8 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs tracking-widest text-white/50 mb-2">TITLE</div>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="메인 제목"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none text-xl font-serif"
              />
              <div className="text-xs tracking-widest text-white/50 mt-5 mb-2">EXCERPT</div>
              <input
                value={form.excerpt}
                onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                placeholder="부제 / 요약"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 outline-none"
              />
            </div>

            {/* Editor Toolbar */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-wrap gap-2">
              <button className="btn" onClick={() => editor?.chain().focus().toggleBold().run()}>
                Bold
              </button>
              <button className="btn" onClick={() => editor?.chain().focus().toggleItalic().run()}>
                Italic
              </button>
              <button className="btn" onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
                Left
              </button>
              <button className="btn" onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
                Center
              </button>
              <button className="btn" onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
                Right
              </button>

              <button
                className="btn"
                onClick={() => {
                  const url = prompt("링크 URL");
                  if (!url) return;
                  editor?.chain().focus().setLink({ href: url }).run();
                }}
              >
                Link
              </button>

              <label className="btn cursor-pointer">
                Upload Image
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      await uploadInlineImage(f);
                    } catch (err) {
                      console.error(err);
                      alert("본문 이미지 업로드 실패");
                    }
                  }}
                />
              </label>

              <button className="btn" onClick={() => editor?.chain().focus().undo().run()}>
                Undo
              </button>
              <button className="btn" onClick={() => editor?.chain().focus().redo().run()}>
                Redo
              </button>
            </div>

            {/* Editor */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-0 overflow-hidden">
              <div className="bg-black/40 px-5 py-3 text-xs text-white/50">
                본문 에디터
              </div>
              <div className="bg-white text-black p-6 min-h-[500px]">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tailwind 없을 때 대비 간단 버튼 스타일 */}
      <style>{`
        .btn{
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.06);
          color: white;
          font-weight: 700;
          font-size: 12px;
        }
        .btn:hover{ background: white; color: black; }
      `}</style>
    </div>
  );
}
