import { Node, mergeAttributes } from "@tiptap/core";

export const UfTable = Node.create({
  name: "ufTable",
  group: "block",
  draggable: true,

  addAttributes() {
    return {
      rows: { default: 3 },
      cols: { default: 3 },
      // cells: 2D array (rows x cols)
      cells: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-uf="table"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const rows = Number(HTMLAttributes.rows || 3);
    const cols = Number(HTMLAttributes.cols || 3);

    let cells = HTMLAttributes.cells;
    if (!Array.isArray(cells)) {
      cells = Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => (r === 0 ? `H${c + 1}` : `R${r}C${c + 1}`))
      );
    }

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "table",
        class: "uf-table",
      }),
      [
        "table",
        { class: "uf-table__table" },
        [
          "tbody",
          {},
          ...cells.slice(0, rows).map((row, r) => [
            "tr",
            { class: "uf-table__tr" },
            ...row.slice(0, cols).map((cell) => [
              r === 0 ? "th" : "td",
              { class: r === 0 ? "uf-table__th" : "uf-table__td" },
              String(cell ?? ""),
            ]),
          ]),
        ],
      ],
    ];
  },
});