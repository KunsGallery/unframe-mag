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
            parseHTML: (element) => element.style.fontFamily?.replace(/['"]/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontFamily) return {};
              return { style: `font-family: ${attributes.fontFamily}` };
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
          if (!fontFamily) return chain().unsetFontFamily().run();
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
