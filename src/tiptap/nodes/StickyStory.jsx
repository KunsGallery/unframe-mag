// src/tiptap/nodes/StickyStory.jsx
import { Node, mergeAttributes } from "@tiptap/core";
import React, { useMemo, useRef } from "react";
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";
import { uploadImage } from "../../services/upload.js";

const WIDTH_PRESETS = [
  { label: "30%", value: 30 },
  { label: "38%", value: 38 },
  { label: "46%", value: 46 },
  { label: "54%", value: 54 },
  { label: "62%", value: 62 },
  { label: "70%", value: 70 },
];

const HEIGHT_PRESETS = [
  { label: "280", value: 280 },
  { label: "360", value: 360 },
  { label: "440", value: 440 },
  { label: "520", value: 520 },
  { label: "620", value: 620 },
  { label: "760", value: 760 },
];

function StickyStoryView({ node, updateAttributes }) {
  const {
    src = "",
    caption = "",
    mediaWidth = 46,
    mediaHeight = 520,
    fit = "cover",
    side = "left",
    radius = "md",  // sm|md|lg
    shadow = "soft", // none|soft|strong
    border = "on",  // on|off
  } = node.attrs;

  const fileRef = useRef(null);

  const styleVars = useMemo(() => {
    const w = Number(mediaWidth || 46);
    const h = Number(mediaHeight || 520);
    return {
      "--uf-sticky-mediaW": `${w}%`,
      "--uf-sticky-mediaH": `${h}px`,
      "--uf-sticky-fit": fit || "cover",
    };
  }, [mediaWidth, mediaHeight, fit]);

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
    <NodeViewWrapper
      className={`uf-stickyNode is-${side} radius-${radius} shadow-${shadow} border-${border}`}
      data-uf-node-ui="1"
      style={styleVars}
    >
      <div className="uf-stickyNode__head">
        <div className="uf-stickyNode__title">STICKY</div>

        <div className="uf-stickyNode__tools">
          <button
            type="button"
            className="uf-miniBtn"
            onClick={() => {
              const url = window.prompt("Image URL", src || "https://");
              if (url === null) return;
              updateAttributes({ src: (url || "").trim() });
            }}
          >
            Set URL
          </button>

          <button type="button" className="uf-miniBtn" onClick={() => fileRef.current?.click()}>
            Upload
          </button>

          <select className="uf-miniSelect" value={String(mediaWidth)} onChange={(e) => updateAttributes({ mediaWidth: Number(e.target.value) })}>
            {WIDTH_PRESETS.map((p) => <option key={p.value} value={p.value}>W {p.label}</option>)}
          </select>

          <select className="uf-miniSelect" value={String(mediaHeight)} onChange={(e) => updateAttributes({ mediaHeight: Number(e.target.value) })}>
            {HEIGHT_PRESETS.map((p) => <option key={p.value} value={p.value}>H {p.label}px</option>)}
          </select>

          <button type="button" className={`uf-miniBtn ${fit === "cover" ? "is-on" : ""}`} onClick={() => updateAttributes({ fit: "cover" })}>cover</button>
          <button type="button" className={`uf-miniBtn ${fit === "contain" ? "is-on" : ""}`} onClick={() => updateAttributes({ fit: "contain" })}>contain</button>

          <button type="button" className={`uf-miniBtn ${side === "left" ? "is-on" : ""}`} onClick={() => updateAttributes({ side: "left" })}>←</button>
          <button type="button" className={`uf-miniBtn ${side === "right" ? "is-on" : ""}`} onClick={() => updateAttributes({ side: "right" })}>→</button>

          {/* 7.1 presets */}
          <select className="uf-miniSelect" value={radius} onChange={(e) => updateAttributes({ radius: e.target.value })} title="radius">
            <option value="sm">Radius sm</option>
            <option value="md">Radius md</option>
            <option value="lg">Radius lg</option>
          </select>

          <select className="uf-miniSelect" value={shadow} onChange={(e) => updateAttributes({ shadow: e.target.value })} title="shadow">
            <option value="none">Shadow none</option>
            <option value="soft">Shadow soft</option>
            <option value="strong">Shadow strong</option>
          </select>

          <button
            type="button"
            className={`uf-miniBtn ${border === "on" ? "is-on" : ""}`}
            onClick={() => updateAttributes({ border: border === "on" ? "off" : "on" })}
            title="border"
          >
            Border
          </button>
        </div>
      </div>

      <div className="uf-stickyNode__grid">
        <figure className="uf-stickyMedia">
          {src ? (
            <img className="uf-stickyImg" src={src} alt={caption || "sticky"} />
          ) : (
            <div className="uf-stickyEmpty">이미지 업로드/URL을 넣어주세요</div>
          )}

          <figcaption className="uf-stickyCap">
            <input
              className="uf-captionInput"
              value={caption}
              placeholder="caption (선택)"
              onChange={(e) => updateAttributes({ caption: e.target.value })}
            />
          </figcaption>
        </figure>

        <div className="uf-stickyText">
          <NodeViewContent className="uf-stickyContent ProseMirror" />
        </div>
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

export const StickyStory = Node.create({
  name: "stickyStory",
  group: "block",
  content: "block+",
  isolating: true,

  addAttributes() {
    return {
      src: { default: "" },
      caption: { default: "" },
      mediaWidth: { default: 46 },
      mediaHeight: { default: 520 },
      fit: { default: "cover" },
      side: { default: "left" },
      radius: { default: "md" },
      shadow: { default: "soft" },
      border: { default: "on" },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-uf="stickyStory"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, caption, mediaWidth, mediaHeight, fit, side, radius, shadow, border } = node.attrs;
    const w = Number(mediaWidth || 46);
    const h = Number(mediaHeight || 520);

    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "stickyStory",
        "data-side": side || "left",
        style: `--uf-sticky-mediaW:${w}%;--uf-sticky-mediaH:${h}px;--uf-sticky-fit:${fit || "cover"}`,
        class: `uf-stickyView is-${side || "left"} radius-${radius} shadow-${shadow} border-${border} uf-reveal`,
      }),
      [
        "figure",
        { class: "uf-stickyFigure" },
        ["img", { src: src || "", alt: caption || "", class: "uf-stickyImg" }],
        ["figcaption", { class: "uf-stickyCaption" }, caption || ""],
      ],
      ["div", { class: "uf-stickyBody" }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(StickyStoryView);
  },
});
