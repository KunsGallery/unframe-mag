// src/tiptap/nodes/UfImage.jsx
import { Node, mergeAttributes } from "@tiptap/core";
import React, { useRef } from "react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { uploadImage } from "../../services/upload";

const SIZE_OPTIONS = ["full", "wide", "large", "medium", "small", "tiny"];
const ALIGN_OPTIONS = ["left", "center", "right"];
const CAP_STYLE = ["regular", "italic", "small"];

function UfImageView({ node, updateAttributes }) {
  const { src, caption = "", size = "full", align = "center", capAlign = "center", capStyle = "regular" } = node.attrs;
  const fileRef = useRef(null);

  async function replaceImage(file) {
    if (!file) return;
    try {
      const res = await uploadImage(file);
      if (res?.url) updateAttributes({ src: res.url });
    } catch (e) {
      console.error("replace image fail:", e);
    }
  }

  return (
    <NodeViewWrapper className="uf-nodeBox uf-nodeBox--image" data-uf-node="ufImage" data-uf-node-ui>
      <div className="uf-nodeHead">
        <div>
          <div className="uf-nodeTitle">IMAGE</div>
          <div className="uf-nodeHint">사이즈/정렬 + 캡션 스타일 + 교체/삭제</div>
        </div>

        <div className="uf-nodeTools">
          <select className="uf-miniSelect" value={size} onChange={(e) => updateAttributes({ size: e.target.value })} title="size">
            {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select className="uf-miniSelect" value={align} onChange={(e) => updateAttributes({ align: e.target.value })} title="align">
            {ALIGN_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <select className="uf-miniSelect" value={capAlign} onChange={(e) => updateAttributes({ capAlign: e.target.value })} title="caption align">
            {ALIGN_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <select className="uf-miniSelect" value={capStyle} onChange={(e) => updateAttributes({ capStyle: e.target.value })} title="caption style">
            {CAP_STYLE.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <button className="uf-miniBtn" type="button" onClick={() => fileRef.current?.click()} disabled={!src}>
            Replace
          </button>
          <button className="uf-miniBtn" type="button" onClick={() => updateAttributes({ src: "", caption: "" })} disabled={!src}>
            Delete
          </button>
        </div>
      </div>

      {!src ? (
        <div className="uf-nodeBody">
          <div className="uf-nodeEmpty">이미지 src가 비어있어요. 에디터 상단 Upload / + 메뉴 업로드로 추가해보세요.</div>
        </div>
      ) : (
        <figure
          className={`uf-figure is-${size} is-align-${align} is-capAlign-${capAlign} is-capStyle-${capStyle}`}
          data-uf="image"
        >
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

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) replaceImage(f);
        }}
      />
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
      size: { default: "full" }, // full|wide|large|medium|small|tiny
      align: { default: "center" }, // left|center|right
      capAlign: { default: "center" }, // left|center|right
      capStyle: { default: "regular" }, // regular|italic|small
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-uf="image"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, caption, size, align, capAlign, capStyle } = node.attrs;

    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "image",
        class: `uf-figure is-${size || "full"} is-align-${align || "center"} is-capAlign-${capAlign || "center"} is-capStyle-${capStyle || "regular"}`,
      }),
      ["img", { src: src || "", alt: caption || "" }],
      ["figcaption", {}, caption || ""],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UfImageView);
  },
});
