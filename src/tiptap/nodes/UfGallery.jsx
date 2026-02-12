// src/tiptap/nodes/UfGallery.jsx
import { Node, mergeAttributes } from "@tiptap/core";
import React, { useRef } from "react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { uploadImage } from "../../services/upload";

function safeParseItems(str) {
  try {
    const arr = JSON.parse(str || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function safeStringifyItems(items) {
  try {
    return JSON.stringify(Array.isArray(items) ? items : []);
  } catch {
    return "[]";
  }
}

function UfGalleryView({ node, updateAttributes }) {
  const { itemsJson = "[]", cols = 3 } = node.attrs;
  const items = safeParseItems(itemsJson);
  const fileRef = useRef(null);

  async function addFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;

    for (const f of list) {
      try {
        const res = await uploadImage(f);
        if (res?.url) {
          const next = [...items, { src: res.url, caption: "" }];
          updateAttributes({ itemsJson: safeStringifyItems(next) });
        }
      } catch (e) {
        console.error("gallery upload fail:", e);
      }
    }
  }

  function removeAt(i) {
    const next = items.filter((_, idx) => idx !== i);
    updateAttributes({ itemsJson: safeStringifyItems(next) });
  }

  function setCaption(i, v) {
    const next = items.map((it, idx) => (idx === i ? { ...it, caption: v } : it));
    updateAttributes({ itemsJson: safeStringifyItems(next) });
  }

  return (
    <NodeViewWrapper className="uf-nodeBox uf-nodeBox--gallery" data-uf-node="ufGallery" data-uf-node-ui>
      <div className="uf-nodeHead">
        <div>
          <div className="uf-nodeTitle">GALLERY</div>
          <div className="uf-nodeHint">이미지 여러 장을 그리드로 배치 (업로드/삭제/캡션)</div>
        </div>

        <div className="uf-nodeTools">
          <select
            className="uf-miniSelect"
            value={cols}
            onChange={(e) => updateAttributes({ cols: Number(e.target.value) })}
            title="columns"
          >
            {[2, 3].map((n) => (
              <option key={n} value={n}>
                {n} cols
              </option>
            ))}
          </select>

          <button className="uf-miniBtn" type="button" onClick={() => fileRef.current?.click()}>
            + Add
          </button>
        </div>
      </div>

      <div className="uf-nodeBody">
        {items.length === 0 ? (
          <div className="uf-nodeEmpty">아직 이미지가 없어요. + Add로 업로드해보세요.</div>
        ) : (
          <div className={`uf-gallery uf-gallery--${cols}`} data-uf="gallery">
            {items.map((it, i) => (
              <figure key={`${it.src}-${i}`} className="uf-galleryItem">
                <div className="uf-galleryImgWrap">
                  <img src={it.src} alt={it.caption || "gallery"} />
                  <button className="uf-galleryDel" type="button" onClick={() => removeAt(i)} title="remove">
                    ×
                  </button>
                </div>
                <input
                  className="uf-captionInput"
                  value={it.caption || ""}
                  placeholder="caption (선택)"
                  onChange={(e) => setCaption(i, e.target.value)}
                />
              </figure>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const files = e.target.files;
            e.target.value = "";
            if (files?.length) addFiles(files);
          }}
        />
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
      itemsJson: { default: "[]" }, // JSON.stringify([{src, caption}...])
      cols: { default: 3 }, // 2 or 3
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-uf="gallery"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { itemsJson, cols } = node.attrs;
    const items = safeParseItems(itemsJson);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "gallery",
        "data-cols": String(cols || 3),
        "data-items": itemsJson || "[]",
        class: `uf-gallery uf-gallery--${cols || 3}`,
      }),
      ...items.map((it) => [
        "figure",
        { class: "uf-galleryItem" },
        ["img", { src: it?.src || "", alt: it?.caption || "" }],
        ["figcaption", { class: "uf-galleryCap" }, it?.caption || ""],
      ]),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UfGalleryView);
  },
});
