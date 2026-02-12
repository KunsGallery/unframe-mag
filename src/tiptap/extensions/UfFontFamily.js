// src/tiptap/extensions/UfFontFamily.js
import { Extension } from "@tiptap/core";

export const UfFontFamily = Extension.create({
  name: "ufFontFamily",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontFamily: {
            default: null,
            parseHTML: (el) => el.style.fontFamily?.replace(/["']/g, "") || null,
            renderHTML: (attrs) => {
              if (!attrs.fontFamily) return {};
              return { style: `font-family: ${attrs.fontFamily}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily) =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontFamily }).run();
        },
      unsetFontFamily:
        () =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontFamily: null }).removeEmptyTextStyle().run();
        },
    };
  },
});
