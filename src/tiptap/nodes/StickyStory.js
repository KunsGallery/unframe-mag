import { Node, mergeAttributes } from '@tiptap/core';
import { STICKY_STORY_DEFAULTS } from '../../constants/editorBlocks';

export const StickyStory = Node.create({
  name: 'stickyStory',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      imageSrc: { default: null },
      imagePos: { default: STICKY_STORY_DEFAULTS.imagePos },
      stickyHeight: { default: STICKY_STORY_DEFAULTS.stickyHeight },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-uf="sticky-story"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { imageSrc, imagePos, stickyHeight } = HTMLAttributes;

    const visualChildren = imageSrc
      ? [[
          "img",
          { src: String(imageSrc), alt: "", class: "uf-sticky-story__img" },
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
        class: `uf-sticky-story is-${imagePos || "left"}`,
        style: `--uf-sticky-height: ${stickyHeight || STICKY_STORY_DEFAULTS.stickyHeight};`,
      }),
      ["div", { class: "uf-sticky-story__visual" }, ...visualChildren],
      ["div", { class: "uf-sticky-story__content" }, 0],
    ];
  },
});
