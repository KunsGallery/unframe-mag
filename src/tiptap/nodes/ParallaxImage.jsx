// src/tiptap/nodes/ParallaxImage.jsx
import { Node, mergeAttributes } from "@tiptap/core";
import React, { useRef } from "react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { uploadImage } from "../../services/upload.js";

const SIZE_PRESETS = [
  { label: "full", value: "full" },
  { label: "wide", value: "wide" },
  { label: "medium", value: "medium" },
  { label: "small", value: "small" },
];

const HEIGHT_PRESETS = [260, 340, 420, 520, 640, 780, 920];
const SPEED_PRESETS = [0.1, 0.14, 0.18, 0.24, 0.3, 0.4];

function ParallaxImageView({ node, updateAttributes }) {
  const { src = "", speed = 0.18, height = 520, size = "wide" } = node.attrs;
  const fileRef = useRef(null);

  async function onPick(file) {
    if (!file) return;
    try {
      const res = await uploadImage(file);
      if (res?.url) updateAttributes({ src: res.url });
    } catch (e) {
      console.error(e);
      alert("업로드 실패. (cloudinary-sign 환경변수/함수 확인 필요)");
    }
  }

  return (
    <NodeViewWrapper className="uf-nodeBox uf-nodeBox--parallax" data-uf-node-ui="1">
      <div className="uf-nodeHead">
        <div className="uf-nodeTitle">PARALLAX</div>
        <div className="uf-nodeHint">View에서 스크롤에 따라 이미지가 움직여요</div>

        <div className="uf-nodeTools" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="uf-miniBtn"
            onClick={() => {
              const url = window.prompt("Parallax Image URL", src || "https://");
              if (url === null) return;
              updateAttributes({ src: (url || "").trim() });
            }}
          >
            Set URL
          </button>

          <button type="button" className="uf-miniBtn" onClick={() => fileRef.current?.click()}>
            Upload
          </button>

          <select className="uf-miniSelect" value={size} onChange={(e) => updateAttributes({ size: e.target.value })}>
            {SIZE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          <select className="uf-miniSelect" value={String(height)} onChange={(e) => updateAttributes({ height: Number(e.target.value) })}>
            {HEIGHT_PRESETS.map((h) => <option key={h} value={h}>H {h}px</option>)}
          </select>

          <select className="uf-miniSelect" value={String(speed)} onChange={(e) => updateAttributes({ speed: Number(e.target.value) })}>
            {SPEED_PRESETS.map((s) => <option key={s} value={s}>speed {s}</option>)}
          </select>
        </div>
      </div>

      <div className="uf-nodeBody">
        {!src ? (
          <div className="uf-nodeEmpty">이미지 업로드 또는 URL을 넣어주세요</div>
        ) : (
          <div className={`uf-parallaxEditorPreview is-${size}`} style={{ height: Number(height || 520) }}>
            <img src={src} alt="parallax" />
            <div className="uf-parallaxEditorBadge">PARALLAX</div>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(f);
        }}
      />
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
      height: { default: 520 },
      size: { default: "wide" },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-uf="parallax"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, speed, height, size } = node.attrs;

    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "parallax",
        "data-speed": String(speed ?? 0.18),
        class: `uf-parallaxFigure is-${size || "wide"} uf-reveal`,
        style: `height:${Number(height || 520)}px`,
      }),
      ["img", { src: src || "", alt: "", class: "uf-parallaxImg", "data-speed": String(speed ?? 0.18) }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ParallaxImageView);
  },
});
