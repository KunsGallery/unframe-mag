import { Node, mergeAttributes } from "@tiptap/core";

export const UfDivider = Node.create({
  name: "ufDivider",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      styleType: { default: "line" }, // line, dashed, double, dots, glow, fade, space
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-uf="divider"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const styleType = HTMLAttributes.styleType || "line";

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "divider",
        class: `uf-divider is-${styleType}`,
      }),
    ];
  },
});