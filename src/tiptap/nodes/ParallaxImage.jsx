import { Node, mergeAttributes } from "@tiptap/core";
import React from "react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

function ParallaxImageView({ node, updateAttributes }) {
  const { src = "", speed = 0.18 } = node.attrs;

  return (
    <NodeViewWrapper className="uf-nodeBox uf-nodeBox--parallax" data-uf-node="parallaxImage">
      <div className="uf-nodeHead">
        <div className="uf-nodeTitle">PARALLAX IMAGE</div>
        <div className="uf-nodeHint">스크롤할 때 이미지가 살짝 떠다니는 효과 (ViewPage에서 적용).</div>
        <div className="uf-nodeTools">
          <label className="uf-label" style={{ margin: 0 }}>speed</label>
          <input
            type="number"
            step="0.02"
            min="0"
            max="0.6"
            value={Number(speed)}
            className="uf-input"
            style={{ width: 120, height: 34, padding: "6px 10px" }}
            onChange={(e) => updateAttributes({ speed: Number(e.target.value || 0.18) })}
          />
        </div>
      </div>

      <div className="uf-nodeBody">
        <input
          className="uf-input"
          placeholder="이미지 URL (업로드 버튼으로 넣는 걸 추천)"
          value={src}
          onChange={(e) => updateAttributes({ src: e.target.value })}
        />
        <div style={{ height: 10 }} />
        {src ? (
          <img src={src} alt="parallax" style={{ width: "100%", borderRadius: 16, border: "1px solid var(--line)" }} />
        ) : (
          <div className="uf-nodeEmpty">이미지 없음</div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const ParallaxImage = Node.create({
  name: "parallaxImage",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: "" },
      speed: { default: 0.18 },
    };
  },

  parseHTML() {
    return [{ tag: 'img[data-uf="parallax"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, speed } = node.attrs;
    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "parallax",
        "data-speed": String(speed ?? 0.18),
        class: "uf-parallax",
        src: src || "",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ParallaxImageView);
  },
});
