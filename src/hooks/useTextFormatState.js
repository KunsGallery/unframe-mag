import { useEditorState } from "@tiptap/react";
import { hasFormatting } from "../lib/textFormatting";

const EMPTY = {
  empty: true, bold: false, italic: false, underline: false, strike: false, superscript: false, subscript: false,
  link: false, code: false, fontSize: null, color: null, highlight: null, cleanable: false, dropCap: false, inParagraph: false,
};

// Inline-format state at the selection, shared by the toolbar and the selection bubble.
export function useTextFormatState(editor) {
  return useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current || current.isDestroyed) return EMPTY;
      const { state } = current;
      const textStyle = current.getAttributes("textStyle");
      return {
        empty: state.selection.empty,
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        strike: current.isActive("strike"),
        superscript: current.isActive("superscript"),
        subscript: current.isActive("subscript"),
        link: current.isActive("link"),
        code: current.isActive("codeBlock") || current.isActive("code"),
        fontSize: textStyle.fontSize || null,
        color: textStyle.color || null,
        highlight: current.getAttributes("highlight").color || null,
        cleanable: hasFormatting(state),
        dropCap: !!state.selection.$from.parent.attrs?.dropCap,
        inParagraph: state.selection.$from.parent.type.name === "paragraph",
      };
    },
  }) || EMPTY;
}
