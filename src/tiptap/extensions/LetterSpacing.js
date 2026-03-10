import { Extension } from "@tiptap/core";

export const LetterSpacing = Extension.create({
  name: "letterSpacing",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element) => {
              const v = element.style.letterSpacing || null;
              if (!v) return null;
              return v.endsWith("px") ? v : `${v}px`;
            },
            renderHTML: (attributes) => {
              if (!attributes.letterSpacing) return {};
              return { style: `letter-spacing: ${attributes.letterSpacing}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLetterSpacing:
        (letterSpacing) =>
        ({ chain }) => {
          const value =
            letterSpacing == null || letterSpacing === ""
              ? null
              : String(letterSpacing).endsWith("px")
              ? String(letterSpacing)
              : `${letterSpacing}px`;

          return chain().setMark("textStyle", { letterSpacing: value }).run();
        },

      unsetLetterSpacing:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { letterSpacing: null }).removeEmptyTextStyle().run(),
    };
  },
});