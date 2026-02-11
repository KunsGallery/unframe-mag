import React, { useRef, useState } from "react";

/**
 * Notion-style + menu
 * - editor 인스턴스만 넣어주면 바로 동작
 * - 이미지 업로드는 onPickImage(file) 콜백으로 처리
 */
export default function BlockPlusMenu({ editor, onPickImage }) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef(null);

  if (!editor) return null;

  const insertScene = () => {
    editor.chain().focus().insertContent({
      type: "scene",
      content: [{ type: "paragraph" }],
    }).run();
    setOpen(false);
  };

  const insertSticky = () => {
    editor.chain().focus().insertContent({
      type: "stickyStory",
      attrs: { src: "", caption: "" },
      content: [{ type: "paragraph" }],
    }).run();
    setOpen(false);
  };

  const insertParallax = () => {
    const url = window.prompt("Parallax Image URL (나중에 업로드로도 가능)", "https://");
    if (!url) return;
    editor.chain().focus().insertContent({
      type: "parallaxImage",
      attrs: { src: url, speed: 0.18 },
    }).run();
    setOpen(false);
  };

  const insertQuote = () => {
    editor.chain().focus().toggleBlockquote().run();
    setOpen(false);
  };

  const insertDivider = () => {
    editor.chain().focus().setHorizontalRule().run();
    setOpen(false);
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    setOpen(false);
  };

  const insertYoutube = () => {
    const url = window.prompt("YouTube URL", "https://www.youtube.com/watch?v=");
    if (!url) return;
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
    setOpen(false);
  };

  const onClickUpload = () => {
    fileRef.current?.click();
  };

  return (
    <div className="uf-plusMenu">
      <button
        type="button"
        className="uf-plusBtn"
        onClick={() => setOpen((v) => !v)}
        title="블록 추가"
      >
        +
      </button>

      {open && (
        <div className="uf-plusPanel">
          <button className="uf-plusItem" onClick={insertScene}>+ Scene (장면)</button>
          <button className="uf-plusItem" onClick={insertSticky}>+ Sticky Story</button>
          <button className="uf-plusItem" onClick={insertParallax}>+ Parallax Image</button>
          <button className="uf-plusItem" onClick={insertQuote}>+ Quote</button>
          <button className="uf-plusItem" onClick={insertDivider}>+ Scene Break (HR)</button>
          <button className="uf-plusItem" onClick={insertTable}>+ Table</button>
          <button className="uf-plusItem" onClick={insertYoutube}>+ YouTube</button>

          <button className="uf-plusItem is-primary" onClick={onClickUpload}>
            + Upload Image
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPickImage?.(f);
          setOpen(false);
        }}
      />
    </div>
  );
}
