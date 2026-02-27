import { Node, mergeAttributes } from '@tiptap/core';

export const ParallaxImage = Node.create({
  name: 'parallaxImage',
  group: 'block',
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      caption: { default: '' },
      speed: { default: 0.2 }, // 패럴랙스 강도
      height: { default: '70vh' },
      bleed: { default: true }, // 전체 너비 사용 여부
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-uf="parallax"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, caption, height, bleed } = HTMLAttributes;
    return [
      'figure',
      mergeAttributes(HTMLAttributes, {
        'data-uf': 'parallax',
        class: `uf-parallax ${bleed ? 'is-full' : ''}`,
        style: `--uf-height: ${height};`
      }),
      ['div', { class: 'uf-parallax__wrapper' },
        ['img', { src: src, class: 'uf-parallax__img' }]
      ],
      caption ? ['figcaption', { class: 'uf-parallax__caption' }, caption] : '',
    ];
  },
});