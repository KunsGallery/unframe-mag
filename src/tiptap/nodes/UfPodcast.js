// src/tiptap/nodes/UfPodcast.js
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import UfEmbedNodeView from "../../components/embed/UfEmbedNodeView";
import { defaultEmbedHeight, toEmbedURL } from "../../lib/ufEmbed";

export const UfPodcast = Node.create({
  name: "ufPodcast",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      kind: { default: "podcast" },
      url: { default: "" },
      embedUrl: { default: "" },
      height: { default: defaultEmbedHeight("podcast") },
      theme: { default: "0" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-uf="podcast"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "podcast",
        class: "uf-embed uf-embed--podcast",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UfEmbedNodeView);
  },

  addCommands() {
    return {
      insertUfPodcast:
        (opts = {}) =>
        ({ commands }) => {
          const url = String(opts.url || "").trim();
          const theme = String(opts.theme ?? "0");
          const r = url ? toEmbedURL("podcast", url, { theme }) : null;

          return commands.insertContent({
            type: this.name,
            attrs: {
              kind: "podcast",
              url: url || "",
              embedUrl: r?.ok ? r.embedUrl : "",
              height: Number(opts.height || defaultEmbedHeight("podcast")),
              theme,
            },
          });
        },
    };
  },
});