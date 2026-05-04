import { Node, mergeAttributes } from "@tiptap/core";

const SLIDE_GALLERY_DEFAULTS = {
  fitMode: "height",
  imageHeight: 420,
  heightRatio: "16/9",
  rounded: 20,
};

function normalizeImages(images = []) {
  return (images || []).map((img) => ({
    src: img?.src || "",
    alt: img?.alt || "",
    positionX: Number.isFinite(Number(img?.positionX)) ? Number(img.positionX) : 50,
    positionY: Number.isFinite(Number(img?.positionY)) ? Number(img.positionY) : 50,
  }));
}

function normalizeFitMode(value) {
  return value === "crop" ? "crop" : SLIDE_GALLERY_DEFAULTS.fitMode;
}

function normalizeImageHeight(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : SLIDE_GALLERY_DEFAULTS.imageHeight;
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
        default: SLIDE_GALLERY_DEFAULTS.heightRatio,
        parseHTML: (element) =>
          element.getAttribute("data-height-ratio") || SLIDE_GALLERY_DEFAULTS.heightRatio,
        renderHTML: (attributes) => ({
          "data-height-ratio":
            attributes.heightRatio || SLIDE_GALLERY_DEFAULTS.heightRatio,
        }),
      },
      rounded: {
        default: SLIDE_GALLERY_DEFAULTS.rounded,
        parseHTML: (element) =>
          Number(element.getAttribute("data-rounded") || SLIDE_GALLERY_DEFAULTS.rounded),
        renderHTML: (attributes) => ({
          "data-rounded": String(attributes.rounded ?? SLIDE_GALLERY_DEFAULTS.rounded),
        }),
      },
      fitMode: {
        default: SLIDE_GALLERY_DEFAULTS.fitMode,
        parseHTML: (element) => normalizeFitMode(element.getAttribute("data-fit-mode")),
        renderHTML: (attributes) => ({
          "data-fit-mode": normalizeFitMode(attributes.fitMode),
        }),
      },
      imageHeight: {
        default: SLIDE_GALLERY_DEFAULTS.imageHeight,
        parseHTML: (element) =>
          normalizeImageHeight(element.getAttribute("data-image-height")),
        renderHTML: (attributes) => ({
          "data-image-height": String(normalizeImageHeight(attributes.imageHeight)),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-uf-slide-gallery]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const images = normalizeImages(node.attrs.images || []);
    const fitMode = normalizeFitMode(node.attrs.fitMode);
    const imageHeight = normalizeImageHeight(node.attrs.imageHeight);
    const heightRatio = node.attrs.heightRatio || SLIDE_GALLERY_DEFAULTS.heightRatio;
    const rounded = Number(node.attrs.rounded ?? SLIDE_GALLERY_DEFAULTS.rounded);
    const totalSlides = images.length;
    const initialCounter = `${totalSlides ? 1 : 0} / ${totalSlides}`;

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-uf-slide-gallery": "true",
        "data-images": JSON.stringify(images),
        "data-height-ratio": heightRatio,
        "data-fit-mode": fitMode,
        "data-image-height": String(imageHeight),
        "data-rounded": String(rounded),
        class: `uf-slide-gallery fit-${fitMode}`,
        style: `--uf-slide-radius:${rounded}px; --uf-slide-image-height:${imageHeight}px;`,
      }),
      [
        "div",
        { class: "uf-slide-gallery__meta" },
        ["span", { class: "uf-slide-gallery__label" }, "SLIDE GALLERY"],
        [
          "span",
          {
            class: "uf-slide-gallery__counter",
            "data-current": totalSlides ? "1" : "0",
            "data-total": String(totalSlides),
          },
          initialCounter,
        ],
      ],
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
            "data-fit-mode": fitMode,
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
