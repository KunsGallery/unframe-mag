// src/tiptap/nodes/UfPlaylist.js
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import UfEmbedNodeView from "../../components/embed/UfEmbedNodeView";
import { defaultEmbedHeight, toEmbedURL } from "../../lib/ufEmbed";

export const UfPlaylist = Node.create({
  name: "ufPlaylist",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      kind: { default: "playlist" },
      url: { default: "" },
      embedUrl: { default: "" },
      height: { default: defaultEmbedHeight("playlist") },
      theme: { default: "0" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-uf="playlist"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // ✅ atom 노드: 0(content hole) 금지
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "playlist",
        class: "uf-embed uf-embed--playlist",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UfEmbedNodeView);
  },

  addCommands() {
    return {
      insertUfPlaylist:
        (opts = {}) =>
        ({ commands }) => {
          const url = String(opts.url || "").trim();
          const theme = String(opts.theme ?? "0");
          const r = url ? toEmbedURL("playlist", url, { theme }) : null;

          return commands.insertContent({
            type: this.name,
            attrs: {
              kind: "playlist",
              url: url || "",
              embedUrl: r?.ok ? r.embedUrl : "",
              height: Number(opts.height || defaultEmbedHeight("playlist")),
              theme,
            },
          });
        },
    };
  },
});