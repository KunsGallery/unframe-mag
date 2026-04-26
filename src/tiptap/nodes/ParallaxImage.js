import { Node, mergeAttributes } from "@tiptap/core";
import { PARALLAX_DEFAULTS } from "../../constants/editorBlocks";

export const ParallaxImage = Node.create({
  name: "parallaxImage",
  group: "block",
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      caption: { default: "" },
      speed: { default: PARALLAX_DEFAULTS.speed },
      height: { default: PARALLAX_DEFAULTS.height },
      bleed: { default: PARALLAX_DEFAULTS.bleed },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-uf="parallax"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, caption, height, bleed, speed } = HTMLAttributes;

    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "parallax",
        "data-speed": String(speed ?? PARALLAX_DEFAULTS.speed),
        class: `uf-parallax ${bleed ? "is-full" : ""}`,
        style: `--uf-height: ${height || PARALLAX_DEFAULTS.height};`,
      }),
      [
        "div",
        { class: "uf-parallax__wrapper" },
        ["img", { src: src || "", class: "uf-parallax__img", alt: "" }],
      ],
      ...(caption ? [["figcaption", { class: "uf-parallax__caption" }, caption]] : []),
    ];
  },
});
