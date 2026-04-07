import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  Rows3,
  Columns2,
  Quote,
  SquareStack,
  Table2,
  Minus,
  Copy,
  Trash2,
} from "lucide-react";
import { useUploadImage } from "../../hooks/useUploadImage";

const BLOCK_SELECTORS = [
  "p",
  "h1",
  "h2",
  "h3",
  "blockquote",
  "ul",
  "ol",
  "pre",
  ".uf-img",
  ".uf-gallery",
  ".uf-slide-gallery",
  ".uf-columns",
  ".tableWrapper",
  ".uf-callout",
  ".uf-divider",
  '[data-uf="sticky-story"]',
].join(",");

function MenuButton({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-[0.14em] italic transition",
        danger
          ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
          : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800",
      ].join(" ")}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

export default function BlockSideInserter({ editor, isDarkMode, onToast }) {
  const rootRef = useRef(null);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const slideInputRef = useRef(null);

  const [anchorRect, setAnchorRect] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null); // "insert" | "actions" | null
  const [currentBlockEl, setCurrentBlockEl] = useState(null);

  const { upload, uploading } = useUploadImage();
  const toast = (m) => (onToast ? onToast(m) : console.log(m));

  const updateAnchor = useMemo(
    () => () => {
      if (!editor?.view?.dom) return;

      const editorRoot = editor.view.dom;
      const sel = window.getSelection();
      if (!sel || !sel.anchorNode) {
        setAnchorRect(null);
        setCurrentBlockEl(null);
        return;
      }

      let node =
        sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode;
      if (!(node instanceof Element)) {
        setAnchorRect(null);
        setCurrentBlockEl(null);
        return;
      }

      const block = node.closest(BLOCK_SELECTORS);
      if (!block || !editorRoot.contains(block)) {
        setAnchorRect(null);
        setCurrentBlockEl(null);
        return;
      }

      const editorRect = editorRoot.getBoundingClientRect();
      const blockRect = block.getBoundingClientRect();

      setCurrentBlockEl(block);
      setAnchorRect({
        top: blockRect.top - editorRect.top + blockRect.height / 2 - 18,
        left: -56,
      });
    },
    [editor]
  );

  useEffect(() => {
    if (!editor) return;

    const onSelection = () => {
      updateAnchor();
      setMenuOpen(null);
    };

    const onDocClick = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (!target.closest(".uf-side-inserter")) {
        setMenuOpen(null);
      }
    };

    updateAnchor();

    editor.on("selectionUpdate", onSelection);
    editor.on("transaction", onSelection);
    window.addEventListener("resize", updateAnchor);
    document.addEventListener("click", onDocClick);

    return () => {
      editor.off("selectionUpdate", onSelection);
      editor.off("transaction", onSelection);
      window.removeEventListener("resize", updateAnchor);
      document.removeEventListener("click", onDocClick);
    };
  }, [editor, updateAnchor]);

  if (!editor || !anchorRect) return null;

  const insertImage = async (file) => {
    try {
      const { url } = await upload(file, { variant: "inline" });
      editor
        .chain()
        .focus()
        .insertContent({
          type: "ufImage",
          attrs: {
            src: url,
            alt: "",
            caption: "",
            size: "normal",
            align: "center",
          },
        })
        .run();
      toast("이미지 삽입 완료");
    } catch (e) {
      console.error(e);
      toast("이미지 업로드 실패");
    } finally {
      setMenuOpen(null);
    }
  };

  const insertGallery = async (files) => {
    try {
      const uploaded = [];
      for (const file of files) {
        const { url } = await upload(file, { variant: "inline" });
        uploaded.push({
          src: url,
          alt: "",
          positionX: 50,
          positionY: 50,
        });
      }

      editor
        .chain()
        .focus()
        .insertContent({
          type: "gallery",
          attrs: {
            images: uploaded,
            columns: 2,
            gap: 12,
          },
        })
        .run();

      toast("갤러리 삽입 완료");
    } catch (e) {
      console.error(e);
      toast("갤러리 업로드 실패");
    } finally {
      setMenuOpen(null);
    }
  };

  const insertSlideGallery = async (files) => {
    try {
      const uploaded = [];
      for (const file of files) {
        const { url } = await upload(file, { variant: "inline" });
        uploaded.push({
          src: url,
          alt: "",
          positionX: 50,
          positionY: 50,
        });
      }

      editor
        .chain()
        .focus()
        .insertContent({
          type: "slideGallery",
          attrs: {
            images: uploaded,
            heightRatio: "16/9",
            rounded: 20,
          },
        })
        .run();

      toast("슬라이드 갤러리 삽입 완료");
    } catch (e) {
      console.error(e);
      toast("슬라이드 갤러리 업로드 실패");
    } finally {
      setMenuOpen(null);
    }
  };

  const duplicateCurrentBlock = () => {
    if (!currentBlockEl || !editor) return;

    try {
      const pos = editor.view.posAtDOM(currentBlockEl, 0);
      const node = editor.state.doc.nodeAt(pos);
      if (!node) return;

      editor
        .chain()
        .focus()
        .insertContentAt(pos + node.nodeSize, node.toJSON())
        .run();

      toast("블록 복제 완료");
    } catch (e) {
      console.error(e);
      toast("블록 복제 실패");
    } finally {
      setMenuOpen(null);
    }
  };

  const deleteCurrentBlock = () => {
    if (!currentBlockEl || !editor) return;

    try {
      const pos = editor.view.posAtDOM(currentBlockEl, 0);
      const node = editor.state.doc.nodeAt(pos);
      if (!node) return;

      editor
        .chain()
        .focus()
        .deleteRange({ from: pos, to: pos + node.nodeSize })
        .run();

      toast("블록 삭제 완료");
    } catch (e) {
      console.error(e);
      toast("블록 삭제 실패");
    } finally {
      setMenuOpen(null);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) await insertImage(file);
          e.target.value = "";
        }}
      />

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) await insertGallery(files);
          e.target.value = "";
        }}
      />

      <input
        ref={slideInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) await insertSlideGallery(files);
          e.target.value = "";
        }}
      />

      <div
        ref={rootRef}
        className="uf-side-inserter absolute z-30"
        style={{
          top: anchorRect.top,
          left: anchorRect.left,
        }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => setMenuOpen((prev) => (prev === "insert" ? null : "insert"))}
            className="w-9 h-9 rounded-full border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
            title="Insert block"
          >
            <Plus size={15} />
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => (prev === "actions" ? null : "actions"))}
            className="w-9 h-9 rounded-full border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-center text-zinc-500 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
            title="Block actions"
          >
            <GripVertical size={15} />
          </button>
        </div>

        {menuOpen === "insert" && (
          <div
            className={`absolute left-12 top-0 w-56 rounded-2xl border shadow-xl p-2 ${
              isDarkMode
                ? "bg-zinc-950 border-zinc-800"
                : "bg-white border-zinc-200"
            }`}
          >
            <MenuButton icon={ImageIcon} label="Image" onClick={() => fileInputRef.current?.click()} />
            <MenuButton icon={LayoutGrid} label="Gallery" onClick={() => galleryInputRef.current?.click()} />
            <MenuButton icon={Rows3} label="Slide Gallery" onClick={() => slideInputRef.current?.click()} />
            <MenuButton
              icon={Columns2}
              label="2 Columns"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "columns",
                    attrs: {
                      columns: 2,
                      gap: 24,
                      stackOnMobile: true,
                      valign: "start",
                    },
                    content: [
                      { type: "column", content: [{ type: "paragraph" }] },
                      { type: "column", content: [{ type: "paragraph" }] },
                    ],
                  })
                  .run();
                setMenuOpen(null);
              }}
            />
            <MenuButton
              icon={Columns2}
              label="3 Columns"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "columns",
                    attrs: {
                      columns: 3,
                      gap: 24,
                      stackOnMobile: true,
                      valign: "start",
                    },
                    content: [
                      { type: "column", content: [{ type: "paragraph" }] },
                      { type: "column", content: [{ type: "paragraph" }] },
                      { type: "column", content: [{ type: "paragraph" }] },
                    ],
                  })
                  .run();
                setMenuOpen(null);
              }}
            />
            <MenuButton
              icon={Quote}
              label="Quote"
              onClick={() => {
                editor.chain().focus().toggleBlockquote().run();
                setMenuOpen(null);
              }}
            />
            <MenuButton
              icon={SquareStack}
              label="Callout"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "ufCallout",
                    attrs: { tone: "note", label: "NOTE" },
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "강조하고 싶은 내용을 입력하세요." }],
                      },
                    ],
                  })
                  .run();
                setMenuOpen(null);
              }}
            />
            <MenuButton
              icon={Table2}
              label="Table"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run();
                setMenuOpen(null);
              }}
            />
            <MenuButton
              icon={Minus}
              label="Divider"
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "ufDivider",
                    attrs: { styleType: "line" },
                  })
                  .run();
                setMenuOpen(null);
              }}
            />
          </div>
        )}

        {menuOpen === "actions" && (
          <div
            className={`absolute left-12 top-0 w-48 rounded-2xl border shadow-xl p-2 ${
              isDarkMode
                ? "bg-zinc-950 border-zinc-800"
                : "bg-white border-zinc-200"
            }`}
          >
            <MenuButton icon={Copy} label="Duplicate" onClick={duplicateCurrentBlock} />
            <MenuButton icon={Trash2} label="Delete" danger onClick={deleteCurrentBlock} />
          </div>
        )}
      </div>
    </>
  );
}