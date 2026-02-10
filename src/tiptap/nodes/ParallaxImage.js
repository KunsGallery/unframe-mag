// src/tiptap/nodes/ParallaxImage.js
// -----------------------------------------------------------------------------
// ✅ Parallax Image Node
// - 뷰에서 스크롤에 따라 translateY가 들어가는 이미지 블록
// - attrs.speed 로 강도 조절(0~1 권장)
// -----------------------------------------------------------------------------

import { Node, mergeAttributes } from "@tiptap/core";

export const ParallaxImage = Node.create({
  name: "parallaxImage",
  group: "block",
  atom: true, // ✅ 내부 편집 X (하나의 블록으로 취급)
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      speed: { default: 0.25 }, // 0.15~0.35 정도가 예쁨
      width: { default: "100%" }, // "100%" | "50%" 등
      align: { default: "center" }, // left|center|right
    };
  },

  parseHTML() {
    return [{ tag: "img[data-uf-parallax]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const align = HTMLAttributes.align || "center";

    // ✅ 정렬은 wrapper(div)로 처리 (img만으로 margin 처리 어려운 경우가 많음)
    const wrapperStyle =
      align === "left"
        ? "display:block; width:100%;"
        : align === "right"
        ? "display:block; width:100%;"
        : "display:block; width:100%;";

    const imgStyle =
      align === "left"
        ? `display:block; width:${HTMLAttributes.width || "100%"}; margin-left:0; margin-right:auto;`
        : align === "right"
        ? `display:block; width:${HTMLAttributes.width || "100%"}; margin-left:auto; margin-right:0;`
        : `display:block; width:${HTMLAttributes.width || "100%"}; margin-left:auto; margin-right:auto;`;

    return [
      "div",
      { class: "uf-parallaxWrap", style: wrapperStyle },
      [
        "img",
        mergeAttributes(HTMLAttributes, {
          "data-uf-parallax": "1",
          class: "uf-parallax",
          style: imgStyle,
        }),
      ],
    ];
  },

  addCommands() {
    return {
      insertParallaxImage:
        (attrs) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs }).run(),

      setParallaxSpeed:
        (speed) =>
        ({ chain }) =>
          chain().updateAttributes(this.name, { speed }).run(),

      setParallaxWidth:
        (width) =>
        ({ chain }) =>
          chain().updateAttributes(this.name, { width }).run(),

      setParallaxAlign:
        (align) =>
        ({ chain }) =>
          chain().updateAttributes(this.name, { align }).run(),
    };
  },
});
