import { Node, mergeAttributes } from "@tiptap/core";

export const Gallery = Node.create({
  name: "gallery",
  group: "block",
  draggable: true,

  addAttributes() {
    return {
      images: { default: [] }, // [{src, alt}]
      columns: { default: 2 }, // 2~4
      gap: { default: 12 },    // px
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-uf="gallery"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const images = Array.isArray(HTMLAttributes.images) ? HTMLAttributes.images : [];
    const columns = Number(HTMLAttributes.columns || 2);
    const gap = Number(HTMLAttributes.gap || 12);

    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "gallery",
        class: `uf-gallery cols-${columns}`,
        style: `--uf-gap:${gap}px;`,
      }),
      [
        "div",
        { class: "uf-gallery__grid" },
        ...images.map((img) => [
          "img",
          { src: img?.src || "", alt: img?.alt || "", class: "uf-gallery__img" },
        ]),
      ],
    ];
  },
});