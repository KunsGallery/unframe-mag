// src/tiptap/nodes/UfGallery.jsx
import { Node, mergeAttributes } from "@tiptap/core";
import React, { useRef } from "react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { uploadImage } from "../../services/upload";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function UfGalleryView({ node, updateAttributes, editor }) {
  const { items = [], cols = 3, gap = 12, radius = 16 } = node.attrs;
  const fileRef = useRef(null);

  const onPickFiles = async (files) => {
    const arr = Array.from(files || []);
    if (!arr.length) return;

    // 업로드 순서대로 items에 push
    const next = [...items];

    for (const f of arr) {
      try {
        const res = await uploadImage(f);
        if (res?.url) {
          next.push({ src: res.url, caption: "" });
        }
      } catch (e) {
        console.error(e);
      }
    }

    updateAttributes({ items: next });
  };

  const onRemove = (idx) => {
    const next = items.filter((_, i) => i !== idx);
    updateAttributes({ items: next });
  };

  const onCaption = (idx, val) => {
    const next = items.map((it, i) => (i === idx ? { ...it, caption: val } : it));
    updateAttributes({ items: next });
  };

  return (
    <NodeViewWrapper className="uf-nodeBox uf-nodeBox--gallery" data-uf-node="ufGallery">
      <div className="uf-nodeHead">
        <div>
          <div className="uf-nodeTitle">GALLERY</div>
          <div className="uf-nodeHint">여러 장 이미지 업로드 → 그리드 갤러리</div>
        </div>

        <div className="uf-nodeTools">
          <label className="uf-miniBtn" style={{ cursor: "pointer" }}>
            + Upload
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                const fs = e.target.files;
                e.target.value = "";
                if (fs) onPickFiles(fs);
              }}
            />
          </label>

          <span className="uf-miniLabel">Cols</span>
          <select
            className="uf-miniSelect"
            value={cols}
            onChange={(e) => updateAttributes({ cols: clamp(Number(e.target.value), 2, 5) })}
          >
            {[2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <span className="uf-miniLabel">Gap</span>
          <select
            className="uf-miniSelect"
            value={gap}
            onChange={(e) => updateAttributes({ gap: clamp(Number(e.target.value), 6, 24) })}
          >
            {[8, 10, 12, 14, 16, 20].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <span className="uf-miniLabel">Radius</span>
          <select
            className="uf-miniSelect"
            value={radius}
            onChange={(e) => updateAttributes({ radius: clamp(Number(e.target.value), 0, 26) })}
          >
            {[0, 10, 14, 16, 18, 22].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="uf-nodeBody">
        {items.length === 0 ? (
          <div className="uf-nodeEmpty">이미지를 업로드해서 갤러리를 만들어보세요.</div>
        ) : (
          <div
            className="uf-gallery"
            style={{
              ["--uf-cols"]: cols,
              ["--uf-gap"]: `${gap}px`,
              ["--uf-radius"]: `${radius}px`,
            }}
          >
            {items.map((it, idx) => (
              <figure key={idx} className="uf-galleryItem">
                <img src={it.src} alt={it.caption || "gallery"} draggable={false} />
                <figcaption className="uf-galleryCap">
                  <input
                    className="uf-captionInput"
                    value={it.caption || ""}
                    placeholder="caption (선택)"
                    onChange={(e) => onCaption(idx, e.target.value)}
                  />
                  <button className="uf-miniBtn" type="button" onClick={() => onRemove(idx)}>
                    Remove
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const UfGallery = Node.create({
  name: "ufGallery",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      cols: { default: 3 },
      gap: { default: 12 },
      radius: { default: 16 },
      items: { default: [] }, // [{src,caption}]
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-uf="gallery"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { cols, gap, radius, items } = node.attrs;

    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "gallery",
        class: "uf-gallery",
        style: `--uf-cols:${cols};--uf-gap:${gap}px;--uf-radius:${radius}px;`,
      }),
      ...(Array.isArray(items) ? items : []).map((it) => [
        "figure",
        { class: "uf-galleryItem" },
        ["img", { src: it?.src || "", alt: it?.caption || "" }],
        it?.caption ? ["figcaption", { class: "uf-galleryCapText" }, it.caption] : ["figcaption", { class: "uf-galleryCapText" }, ""],
      ]),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UfGalleryView);
  },
});
