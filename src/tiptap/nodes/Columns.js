import { Node, mergeAttributes } from "@tiptap/core";

export const Columns = Node.create({
  name: "columns",

  group: "block",
  content: "column{2,3}",
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      columns: {
        default: 2,
        parseHTML: (element) => Number(element.getAttribute("data-columns") || 2),
        renderHTML: (attributes) => ({
          "data-columns": attributes.columns,
        }),
      },
      gap: {
        default: 24,
        parseHTML: (element) => Number(element.getAttribute("data-gap") || 24),
        renderHTML: (attributes) => ({
          "data-gap": attributes.gap,
          style: `--uf-columns-gap:${Number(attributes.gap || 24)}px;`,
        }),
      },
      stackOnMobile: {
        default: true,
        parseHTML: (element) => element.getAttribute("data-stack-mobile") !== "false",
        renderHTML: (attributes) => ({
          "data-stack-mobile": String(attributes.stackOnMobile !== false),
        }),
      },
      valign: {
        default: "start",
        parseHTML: (element) => element.getAttribute("data-valign") || "start",
        renderHTML: (attributes) => ({
          "data-valign": attributes.valign || "start",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-uf-columns]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-uf-columns": "true",
        class: "uf-columns",
      }),
      0,
    ];
  },
});

export const Column = Node.create({
  name: "column",

  group: "block",
  content: "block+",
  isolating: true,
  defining: true,

  parseHTML() {
    return [{ tag: "div[data-uf-column]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-uf-column": "true",
        class: "uf-column",
      }),
      0,
    ];
  },
});