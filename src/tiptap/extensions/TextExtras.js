import { Extension, Mark, mergeAttributes } from "@tiptap/core";
import { stepTextSize } from "../../lib/textFormatting";

// Footnote markers are <sup data-uf-footnote> nodes; never parse them as a plain mark.
const notFootnote = (element) => (element.hasAttribute("data-uf-footnote") ? false : null);

export const Superscript = Mark.create({
  name: "superscript",
  excludes: "subscript",
  parseHTML() {
    return [{ tag: "sup", getAttrs: notFootnote }, { style: "vertical-align", getAttrs: (value) => (value === "super" ? null : false) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return { toggleSuperscript: () => ({ commands }) => commands.toggleMark(this.name) };
  },
  addKeyboardShortcuts() {
    return { "Mod-.": () => this.editor.commands.toggleSuperscript() };
  },
});

export const Subscript = Mark.create({
  name: "subscript",
  excludes: "superscript",
  parseHTML() {
    return [{ tag: "sub" }, { style: "vertical-align", getAttrs: (value) => (value === "sub" ? null : false) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["sub", mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return { toggleSubscript: () => ({ commands }) => commands.toggleMark(this.name) };
  },
  addKeyboardShortcuts() {
    return { "Mod-,": () => this.editor.commands.toggleSubscript() };
  },
});

// Magazine-style enlarged first letter on a paragraph.
export const DropCap = Extension.create({
  name: "dropCap",
  addGlobalAttributes() {
    return [{
      types: ["paragraph"],
      attributes: {
        dropCap: {
          default: false,
          parseHTML: (element) => element.classList.contains("uf-dropcap"),
          renderHTML: (attributes) => (attributes.dropCap ? { class: "uf-dropcap" } : {}),
        },
      },
    }];
  },
  addCommands() {
    return {
      toggleDropCap: () => ({ state, commands }) => {
        const { $from } = state.selection;
        if ($from.parent.type.name !== "paragraph") return false;
        return commands.updateAttributes("paragraph", { dropCap: !$from.parent.attrs.dropCap });
      },
    };
  },
});

// ⌘⇧. / ⌘⇧, step the selection's size along the shared scale.
export const TextSizeShortcuts = Extension.create({
  name: "textSizeShortcuts",
  addKeyboardShortcuts() {
    const step = (direction) => {
      const next = stepTextSize(this.editor.getAttributes("textStyle").fontSize, direction);
      return next ? this.editor.commands.setFontSize(next) : this.editor.commands.unsetFontSize();
    };
    return { "Mod-Shift-.": () => step(1), "Mod-Shift-,": () => step(-1), "Mod->": () => step(1), "Mod-<": () => step(-1) };
  },
});
