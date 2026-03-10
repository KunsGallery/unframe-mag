import { Node, mergeAttributes } from "@tiptap/core";

export const UfCallout = Node.create({
  name: "ufCallout",
  group: "block",
  content: "block+",
  draggable: true,

  addAttributes() {
    return {
      tone: { default: "note" },
      label: { default: "NOTE" },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-uf="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const tone = HTMLAttributes.tone || "note";
    const label = HTMLAttributes.label || "NOTE";

    return [
      "section",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "callout",
        class: `uf-callout is-${tone}`,
      }),
      ["div", { class: "uf-callout__label" }, String(label)],
      ["div", { class: "uf-callout__body" }, 0],
    ];
  },
});