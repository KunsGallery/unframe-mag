import { Node, mergeAttributes } from '@tiptap/core';

export const StickyStory = Node.create({
  name: 'stickyStory',
  group: 'block',
  content: 'block+', // 우측 스크롤될 텍스트 영역

  addAttributes() {
    return {
      imageSrc: { default: null },
      imagePos: { default: 'left' }, // 이미지가 왼쪽인지 오른쪽인지
      stickyHeight: { default: '100vh' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-uf="sticky-story"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const { imageSrc, imagePos } = HTMLAttributes;
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-uf': 'sticky-story',
        class: `uf-sticky-story is-${imagePos}`
      }),
      ['div', { class: 'uf-sticky-story__visual' },
        ['img', { src: imageSrc }]
      ],
      ['div', { class: 'uf-sticky-story__content' }, 0]
    ];
  },
});