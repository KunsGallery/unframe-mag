import { Node, mergeAttributes } from "@tiptap/core";

export const UfImage = Node.create({
  name: "ufImage",
  group: "block",
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      caption: { default: "" },
      size: { default: "normal" }, // normal, wide, full
      align: { default: "center" }, // left, center, right
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-uf="image"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // ✅ 여기서 명시적으로 꺼내서 ReferenceError 방지
    const {
      src,
      alt,
      caption,
      size = "normal",
      align = "center",
    } = HTMLAttributes;

    // ✅ src 없으면 깨진 img 대신 placeholder(또는 빈 figure)
    if (!src) {
      return [
        "figure",
        mergeAttributes(HTMLAttributes, {
          "data-uf": "image",
          class: `uf-img is-${size} align-${align}`,
        }),
        ["div", { class: "uf-img__placeholder" }, "No Image"],
      ];
    }

    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "image",
        class: `uf-img is-${size} align-${align}`,
      }),
      ["img", { src: String(src), alt: alt ? String(alt) : "" }],
      ...(caption
        ? [["figcaption", { class: "uf-img__caption" }, String(caption)]]
        : []),
    ];
  },
});