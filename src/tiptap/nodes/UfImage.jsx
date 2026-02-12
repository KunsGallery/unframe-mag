// src/tiptap/nodes/UfImage.jsx
import { Node, mergeAttributes } from "@tiptap/core";
import React from "react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

const SIZE_KEYS = ["full", "wide", "large", "medium", "small", "tiny"];

function UfImageView({ node, updateAttributes }) {
  const { src, caption = "", size = "full", maxWidth = "" } = node.attrs;

  return (
    <NodeViewWrapper className="uf-nodeBox uf-nodeBox--image" data-uf-node-ui="1">
      <div className="uf-nodeHead">
        <div className="uf-nodeTitle">IMAGE</div>
        <div className="uf-nodeHint">이미지 + 캡션 + 사이즈 + 커스텀 폭(px)</div>

        <div className="uf-nodeTools" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {SIZE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className={`uf-miniBtn ${size === k ? "is-on" : ""}`}
              onClick={() => updateAttributes({ size: k })}
              title={`size: ${k}`}
            >
              {k}
            </button>
          ))}

          <label className="uf-miniLabel" title="maxWidth px (예: 900)">
            maxW
            <input
              style={{ width: 90 }}
              className="uf-input"
              value={maxWidth}
              placeholder="ex) 900"
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d]/g, "");
                updateAttributes({ maxWidth: v });
              }}
            />
          </label>

          <button className="uf-miniBtn" onClick={() => updateAttributes({ maxWidth: "" })} title="reset maxWidth">
            resetW
          </button>
        </div>
      </div>

      {!src ? (
        <div className="uf-nodeBody">
          <div className="uf-nodeEmpty">이미지 src가 비어있어요. 업로드 버튼으로 넣어주세요.</div>
        </div>
      ) : (
        <figure className={`uf-figure is-${size}`} style={maxWidth ? { maxWidth: `${Number(maxWidth)}px` } : undefined}>
          <img src={src} alt={caption || "image"} />
          <figcaption>
            <input
              className="uf-captionInput"
              value={caption}
              placeholder="caption (선택)"
              onChange={(e) => updateAttributes({ caption: e.target.value })}
            />
          </figcaption>
        </figure>
      )}
    </NodeViewWrapper>
  );
}

export const UfImage = Node.create({
  name: "ufImage",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: "" },
      caption: { default: "" },
      size: { default: "full" },
      maxWidth: { default: "" }, // px string
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-uf="image"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, caption, size, maxWidth } = node.attrs;
    const style = maxWidth ? `max-width:${Number(maxWidth)}px;margin-left:auto;margin-right:auto;` : null;

    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "image",
        class: `uf-figure is-${size || "full"} uf-reveal`,
        style: style || undefined,
      }),
      ["img", { src: src || "", alt: caption || "" }],
      ["figcaption", {}, caption || ""],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UfImageView);
  },
});
