import { Node, mergeAttributes } from "@tiptap/core";

function normalizeImages(images = []) {
  return (images || []).map((img) => ({
    src: img?.src || "",
    alt: img?.alt || "",
    positionX: Number.isFinite(Number(img?.positionX)) ? Number(img.positionX) : 50,
    positionY: Number.isFinite(Number(img?.positionY)) ? Number(img.positionY) : 50,
  }));
}

export const SlideGallery = Node.create({
  name: "slideGallery",

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
      heightRatio: {
        default: "16/9",
        parseHTML: (element) => element.getAttribute("data-height-ratio") || "16/9",
        renderHTML: (attributes) => ({
          "data-height-ratio": attributes.heightRatio || "16/9",
        }),
      },
      rounded: {
        default: 20,
        parseHTML: (element) => Number(element.getAttribute("data-rounded") || 20),
        renderHTML: (attributes) => ({
          "data-rounded": String(attributes.rounded ?? 20),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-uf-slide-gallery]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const images = normalizeImages(node.attrs.images || []);
    const heightRatio = node.attrs.heightRatio || "16/9";
    const rounded = Number(node.attrs.rounded ?? 20);

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-uf-slide-gallery": "true",
        "data-images": JSON.stringify(images),
        "data-height-ratio": heightRatio,
        "data-rounded": String(rounded),
        class: "uf-slide-gallery",
        style: `--uf-slide-radius:${rounded}px;`,
      }),
      [
        "div",
        {
          class: "uf-slide-gallery__viewport",
        },
        [
          "button",
          {
            type: "button",
            class: "uf-slide-gallery__arrow uf-slide-gallery__arrow--prev",
            "data-dir": "prev",
            "aria-label": "Previous slide",
          },
          "‹",
        ],
        [
          "div",
          {
            class: "uf-slide-gallery__track",
            "data-ratio": heightRatio,
          },
          ...images.map((img, idx) => [
            "figure",
            {
              class: "uf-slide-gallery__slide",
              "data-index": String(idx),
            },
            [
              "img",
              {
                src: img.src || "",
                alt: img.alt || "",
                class: "uf-slide-gallery__img",
                style: `object-position:${img.positionX ?? 50}% ${img.positionY ?? 50}%;`,
              },
            ],
          ]),
        ],
        [
          "button",
          {
            type: "button",
            class: "uf-slide-gallery__arrow uf-slide-gallery__arrow--next",
            "data-dir": "next",
            "aria-label": "Next slide",
          },
          "›",
        ],
      ],
      [
        "div",
        { class: "uf-slide-gallery__dots" },
        ...images.map((_, idx) => [
          "button",
          {
            type: "button",
            class: "uf-slide-gallery__dot",
            "data-index": String(idx),
            "data-active": idx === 0 ? "true" : "false",
            "aria-label": `Go to slide ${idx + 1}`,
          },
        ]),
      ],
    ];
  },
});