import { Node, mergeAttributes } from "@tiptap/core";
import { GALLERY_DEFAULTS } from "../../constants/editorBlocks";

function normalizeImages(images = []) {
  return (images || []).map((img) => ({
    src: img?.src || "",
    alt: img?.alt || "",
    caption: img?.caption || "",
    positionX: Number.isFinite(Number(img?.positionX)) ? Number(img.positionX) : 50,
    positionY: Number.isFinite(Number(img?.positionY)) ? Number(img.positionY) : 50,
  }));
}

function ratioToCssValue(ratio) {
  return String(ratio || GALLERY_DEFAULTS.ratio).replace("/", " / ");
}

export const Gallery = Node.create({
  name: "gallery",

  group: "block",
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
        default: GALLERY_DEFAULTS.columns,
        parseHTML: (element) => Number(element.getAttribute("data-columns") || GALLERY_DEFAULTS.columns),
        renderHTML: (attributes) => ({
          "data-columns": String(attributes.columns || GALLERY_DEFAULTS.columns),
        }),
      },
      gap: {
        default: GALLERY_DEFAULTS.gap,
        parseHTML: (element) => Number(element.getAttribute("data-gap") || GALLERY_DEFAULTS.gap),
        renderHTML: (attributes) => ({
          "data-gap": String(attributes.gap || GALLERY_DEFAULTS.gap),
          style: `--uf-gap:${Number(attributes.gap || GALLERY_DEFAULTS.gap)}px;`,
        }),
      },
      layout: {
        default: GALLERY_DEFAULTS.layout,
        parseHTML: (element) => element.getAttribute("data-layout") || GALLERY_DEFAULTS.layout,
        renderHTML: (attributes) => ({
          "data-layout": attributes.layout || GALLERY_DEFAULTS.layout,
        }),
      },
      ratio: {
        default: GALLERY_DEFAULTS.ratio,
        parseHTML: (element) => element.getAttribute("data-ratio") || GALLERY_DEFAULTS.ratio,
        renderHTML: (attributes) => ({
          "data-ratio": attributes.ratio || GALLERY_DEFAULTS.ratio,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-uf-gallery]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const images = normalizeImages(node.attrs.images || []);
    const columns = Number(node.attrs.columns || GALLERY_DEFAULTS.columns);
    const gap = Number(node.attrs.gap || GALLERY_DEFAULTS.gap);
    const layout = node.attrs.layout || GALLERY_DEFAULTS.layout;
    const ratio = node.attrs.ratio || GALLERY_DEFAULTS.ratio;

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-uf-gallery": "true",
        "data-columns": String(columns),
        "data-gap": String(gap),
        "data-layout": layout,
        "data-ratio": ratio,
        "data-images": JSON.stringify(images),
        class: `uf-gallery cols-${columns} layout-${layout}`,
        style: `--uf-gap:${gap}px; --uf-gallery-cols:${columns}; --uf-gallery-ratio:${ratioToCssValue(ratio)};`,
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
              "data-caption": img.caption || "",
              class: "uf-gallery__img",
              style: `object-position:${img.positionX ?? 50}% ${img.positionY ?? 50}%;`,
            },
          ],
          ...(img.caption
            ? [["figcaption", { class: "uf-gallery__caption" }, img.caption]]
            : []),
        ]),
      ],
    ];
  },
});
