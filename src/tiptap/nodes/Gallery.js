import { Node, mergeAttributes } from "@tiptap/core";

function normalizeImages(images = []) {
  return (images || []).map((img) => ({
    src: img?.src || "",
    alt: img?.alt || "",
    positionX: Number.isFinite(Number(img?.positionX)) ? Number(img.positionX) : 50,
    positionY: Number.isFinite(Number(img?.positionY)) ? Number(img.positionY) : 50,
  }));
}

export const Gallery = Node.create({
  name: "gallery",

  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (element) => {
          try {
            const raw = element.getAttribute("data-images");
            return normalizeImages(raw ? JSON.parse(raw) : []);
          } catch {
            return [];
          }
        },
        renderHTML: (attributes) => ({
          "data-images": JSON.stringify(normalizeImages(attributes.images)),
        }),
      },
      columns: {
        default: 2,
        parseHTML: (element) => Number(element.getAttribute("data-columns") || 2),
        renderHTML: (attributes) => ({
          "data-columns": String(attributes.columns || 2),
        }),
      },
      gap: {
        default: 12,
        parseHTML: (element) => Number(element.getAttribute("data-gap") || 12),
        renderHTML: (attributes) => ({
          "data-gap": String(attributes.gap || 12),
          style: `--uf-gap:${Number(attributes.gap || 12)}px;`,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-uf-gallery]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const images = normalizeImages(node.attrs.images || []);
    const columns = Number(node.attrs.columns || 2);
    const gap = Number(node.attrs.gap || 12);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-uf-gallery": "true",
        class: `uf-gallery cols-${columns}`,
        style: `--uf-gap:${gap}px;`,
      }),
      [
        "div",
        { class: "uf-gallery__grid" },
        ...images.map((img) => [
          "figure",
          { class: "uf-gallery__item" },
          [
            "img",
            {
              src: img.src || "",
              alt: img.alt || "",
              class: "uf-gallery__img",
              style: `object-position:${img.positionX ?? 50}% ${img.positionY ?? 50}%;`,
            },
          ],
        ]),
      ],
    ];
  },
});