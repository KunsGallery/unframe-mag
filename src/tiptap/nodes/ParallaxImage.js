import { Node, mergeAttributes } from "@tiptap/core";

export const ParallaxImage = Node.create({
  name: "parallaxImage",
  group: "block",
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      caption: { default: "" },
      speed: { default: 0.2 },
      height: { default: "70vh" },
      bleed: { default: true },
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
        "data-speed": String(speed ?? 0.2), // ✅ 런타임에서 읽기 좋게
        class: `uf-parallax ${bleed ? "is-full" : ""}`,
        style: `--uf-height: ${height || "70vh"};`,
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