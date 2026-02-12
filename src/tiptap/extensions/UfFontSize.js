// src/tiptap/extensions/UfFontSize.js
import { Extension } from "@tiptap/core";

export const UfFontSize = Extension.create({
  name: "ufFontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (sizePx) =>
        ({ chain }) => {
          const v = typeof sizePx === "number" ? `${sizePx}px` : String(sizePx);
          return chain().setMark("textStyle", { fontSize: v }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});
