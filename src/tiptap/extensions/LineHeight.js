import { Extension } from "@tiptap/core";

export const LineHeight = Extension.create({
  name: "lineHeight",

  addOptions() {
    return {
      types: ["paragraph", "heading"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => {
              const v = element.style.lineHeight || null;
              if (!v) return null;
              return v.endsWith("px") ? v : `${v}px`;
            },
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ chain }) => {
          const value =
            lineHeight == null || lineHeight === ""
              ? null
              : String(lineHeight).endsWith("px")
              ? String(lineHeight)
              : `${lineHeight}px`;

          return this.options.types.every((type) =>
            chain().updateAttributes(type, { lineHeight: value }).run()
          );
        },

      unsetLineHeight:
        () =>
        ({ chain }) =>
          this.options.types.every((type) =>
            chain().resetAttributes(type, "lineHeight").run()
          ),
    };
  },
});