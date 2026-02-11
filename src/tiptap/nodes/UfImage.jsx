import { Node, mergeAttributes } from "@tiptap/core";
import React from "react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

function UfImageView({ node, updateAttributes }) {
  const { src, caption = "", size = "full" } = node.attrs;

  return (
    <NodeViewWrapper className="uf-nodeBox uf-nodeBox--image" data-uf-node="ufImage">
      <div className="uf-nodeHead">
        <div className="uf-nodeTitle">IMAGE</div>
        <div className="uf-nodeHint">이미지 + 캡션 + 사이즈. (Full/Wide/Medium/Small)</div>

        <div className="uf-nodeTools">
          {["full", "wide", "medium", "small"].map((k) => (
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
        </div>
      </div>

      {!src ? (
        <div className="uf-nodeBody">
          <div className="uf-nodeEmpty">이미지 src가 비어있어요. 업로드 버튼으로 넣어주세요.</div>
        </div>
      ) : (
        <figure className={`uf-figure is-${size}`}>
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
      size: { default: "full" }, // full|wide|medium|small
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-uf="image"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, caption, size } = node.attrs;

    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "image",
        class: `uf-figure is-${size || "full"}`,
      }),
      ["img", { src: src || "", alt: caption || "" }],
      ["figcaption", {}, caption || ""],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UfImageView);
  },
});
