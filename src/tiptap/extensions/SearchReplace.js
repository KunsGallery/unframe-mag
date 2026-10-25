import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const searchReplaceKey = new PluginKey("ufSearchReplace");
const MAX_MATCHES = 2000;

// Matches stay inside one text block but may cross bold/link boundaries.
// Inline leaves (images, footnotes) count as one placeholder character.
export function findMatches(doc, query, { caseSensitive = false } = {}) {
  if (!query) return [];
  const needle = caseSensitive ? query : query.toLowerCase();
  const matches = [];
  doc.descendants((node, pos) => {
    if (matches.length >= MAX_MATCHES) return false;
    if (!node.isTextblock) return true;
    let text = "";
    const positions = [];
    node.forEach((child, offset) => {
      const start = pos + 1 + offset;
      if (child.isText) {
        for (let index = 0; index < child.text.length; index++) positions.push(start + index);
        text += child.text;
      } else {
        positions.push(start);
        text += "￼";
      }
    });
    const haystack = caseSensitive ? text : text.toLowerCase();
    // toLowerCase can change length for a few scripts; skip blocks where offsets would drift.
    if (haystack.length !== text.length) return false;
    for (let index = haystack.indexOf(needle); index !== -1 && matches.length < MAX_MATCHES; index = haystack.indexOf(needle, index + needle.length)) {
      matches.push({ from: positions[index], to: positions[index + needle.length - 1] + 1 });
    }
    return false;
  });
  return matches;
}

const emptyState = { query: "", caseSensitive: false, matches: [], index: -1, decorations: DecorationSet.empty };

function decorate(doc, matches, index) {
  return DecorationSet.create(doc, matches.map((match, position) =>
    Decoration.inline(match.from, match.to, { class: position === index ? "uf-search-match is-current" : "uf-search-match" })));
}

function compute(doc, query, caseSensitive, near = 0) {
  const matches = findMatches(doc, query, { caseSensitive });
  let index = matches.findIndex((match) => match.from >= near);
  if (index === -1) index = matches.length ? 0 : -1;
  return { query, caseSensitive, matches, index, decorations: decorate(doc, matches, index) };
}

export function getSearchState(state) {
  return searchReplaceKey.getState(state) || emptyState;
}

function select(tr, match) {
  if (!match) return tr;
  return tr.setSelection(TextSelection.create(tr.doc, match.from, match.to)).scrollIntoView();
}

export const SearchReplace = Extension.create({
  name: "searchReplace",

  addCommands() {
    return {
      setSearchQuery: (query, { caseSensitive = false } = {}) => ({ state, tr, dispatch }) => {
        const next = compute(state.doc, String(query || ""), caseSensitive, state.selection.from);
        if (dispatch) select(tr.setMeta(searchReplaceKey, next), next.matches[next.index]);
        return true;
      },
      gotoSearchMatch: (step = 1) => ({ state, tr, dispatch }) => {
        const current = getSearchState(state);
        if (!current.matches.length) return false;
        const index = (current.index + step + current.matches.length) % current.matches.length;
        if (dispatch) {
          tr.setMeta(searchReplaceKey, { ...current, index, decorations: decorate(state.doc, current.matches, index) });
          select(tr, current.matches[index]);
        }
        return true;
      },
      replaceSearchMatch: (replacement = "") => ({ state, tr, dispatch }) => {
        const current = getSearchState(state);
        const match = current.matches[current.index];
        if (!match) return false;
        if (dispatch) {
          if (replacement) tr.insertText(replacement, match.from, match.to);
          else tr.delete(match.from, match.to);
          // Recompute after the edit and continue from just past the replaced text.
          const next = compute(tr.doc, current.query, current.caseSensitive, match.from + replacement.length);
          tr.setMeta(searchReplaceKey, next);
          select(tr, next.matches[next.index]);
        }
        return true;
      },
      replaceAllSearchMatches: (replacement = "") => ({ state, tr, dispatch }) => {
        const current = getSearchState(state);
        if (!current.matches.length) return false;
        if (dispatch) {
          for (const match of [...current.matches].reverse()) {
            if (replacement) tr.insertText(replacement, match.from, match.to);
            else tr.delete(match.from, match.to);
          }
          tr.setMeta(searchReplaceKey, compute(tr.doc, current.query, current.caseSensitive));
        }
        return true;
      },
      clearSearch: () => ({ tr, dispatch }) => {
        if (dispatch) tr.setMeta(searchReplaceKey, emptyState);
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchReplaceKey,
        state: {
          init: () => emptyState,
          apply(tr, value) {
            const meta = tr.getMeta(searchReplaceKey);
            if (meta) return meta;
            if (!tr.docChanged || !value.query) return value;
            // Typing while the panel is open keeps highlights in step with the text.
            const near = value.matches[value.index] ? tr.mapping.map(value.matches[value.index].from) : 0;
            return compute(tr.doc, value.query, value.caseSensitive, near);
          },
        },
        props: {
          decorations: (state) => searchReplaceKey.getState(state)?.decorations,
        },
      }),
    ];
  },
});
