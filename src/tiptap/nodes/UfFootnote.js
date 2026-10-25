import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const FOOTNOTE_EDIT_EVENT = "uf:edit-footnote";
export const MAX_FOOTNOTE_LENGTH = 1000;

// An inline marker that carries its note text. Numbers come from a CSS counter,
// so they always follow document order; readers get the list under the article.
export const UfFootnote = Node.create({
  name: "ufFootnote",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      note: {
        default: "",
        parseHTML: (element) => String(element.getAttribute("data-note") || "").slice(0, MAX_FOOTNOTE_LENGTH),
        renderHTML: (attributes) => ({ "data-note": String(attributes.note || ""), title: String(attributes.note || "") }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "sup[data-uf-footnote]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["sup", mergeAttributes(HTMLAttributes, { "data-uf-footnote": "", class: "uf-footnote" })];
  },

  renderText() {
    return "";
  },

  addCommands() {
    return {
      // Inserts after the selection and opens the note editor for the new marker.
      insertFootnote: (note = "") => ({ state, commands }) => {
        const at = state.selection.to;
        if (!commands.insertContentAt(at, { type: this.name, attrs: { note } })) return false;
        if (typeof window !== "undefined") {
          requestAnimationFrame(() => window.dispatchEvent(new CustomEvent(FOOTNOTE_EDIT_EVENT, { detail: { pos: at, note } })));
        }
        return true;
      },
      setFootnoteNote: (pos, note) => ({ tr, state, dispatch }) => {
        const node = state.doc.nodeAt(pos);
        if (node?.type.name !== this.name) return false;
        if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, note: String(note || "").slice(0, MAX_FOOTNOTE_LENGTH) });
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const name = this.name;
    return [
      new Plugin({
        key: new PluginKey("ufFootnoteClick"),
        props: {
          // Clicking a marker in the editor opens its note for editing.
          handleClickOn(view, pos, node) {
            if (node.type.name !== name || !view.editable) return false;
            window.dispatchEvent(new CustomEvent(FOOTNOTE_EDIT_EVENT, { detail: { pos, note: node.attrs.note || "" } }));
            return true;
          },
        },
      }),
    ];
  },
});
