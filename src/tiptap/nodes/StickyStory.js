import { Node, mergeAttributes } from '@tiptap/core';
import {
  STICKY_STORY_DEFAULTS,
  getStickyStoryVisualHeight,
  normalizeStickyStoryVisualSize,
} from '../../constants/editorBlocks';

export const StickyStory = Node.create({
  name: 'stickyStory',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      imageSrc: { default: null },
      imagePos: { default: STICKY_STORY_DEFAULTS.imagePos },
      stickyHeight: { default: STICKY_STORY_DEFAULTS.stickyHeight },
      visualSize: {
        default: STICKY_STORY_DEFAULTS.visualSize,
        parseHTML: (element) =>
          normalizeStickyStoryVisualSize(
            element.getAttribute("data-visual-size") ||
              element.getAttribute("data-image-size")
          ),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-uf="sticky-story"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { imageSrc, imagePos, stickyHeight, visualSize } = node.attrs;
    const resolvedVisualSize = normalizeStickyStoryVisualSize(visualSize);

      const visualChildren = imageSrc
      ? [[
          "img",
          {
            src: String(imageSrc),
            alt: "",
            class: "uf-sticky-story__img",
            "data-original-src": String(imageSrc),
            loading: "lazy",
            decoding: "async",
          },
        ]]
      : [[
          "div",
          { class: "uf-sticky-story__placeholder" },
          "No Image",
        ]];

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-uf": "sticky-story",
        "data-visual-size": resolvedVisualSize,
        class: `uf-sticky-story is-${imagePos || "left"} is-${resolvedVisualSize}`,
        style: `--uf-sticky-height: ${
          stickyHeight || STICKY_STORY_DEFAULTS.stickyHeight
        }; --uf-sticky-visual-height: ${getStickyStoryVisualHeight(
          resolvedVisualSize
        )};`,
      }),
      ["div", { class: "uf-sticky-story__visual" }, ...visualChildren],
      ["div", { class: "uf-sticky-story__content" }, 0],
    ];
  },
});
