import { Node, mergeAttributes } from '@tiptap/core';

export const UfImage = Node.create({
  name: 'ufImage',
  group: 'block',
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      caption: { default: '' },
      size: { default: 'normal' }, // normal, wide, full
      align: { default: 'center' },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-uf="image"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { size, align } = HTMLAttributes;
    return [
      'figure',
      mergeAttributes(HTMLAttributes, {
        'data-uf': 'image',
        class: `uf-img is-${size} align-${align}`
      }),
      ['img', { src: HTMLAttributes.src, alt: HTMLAttributes.alt }],
      HTMLAttributes.caption ? ['figcaption', { class: 'uf-img__caption' }, HTMLAttributes.caption] : '',
    ];
  },
});