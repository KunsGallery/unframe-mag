import { Node, mergeAttributes } from '@tiptap/core';

export const Scene = Node.create({
  name: 'scene',
  group: 'block',
  content: 'block+', // 내부에는 다른 블록 요소들이 올 수 있음
  
  addAttributes() {
    return {
      padding: { default: 'medium' }, // small, medium, large
      background: { default: 'transparent' },
      theme: { default: 'light' }, // light, dark
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-type="uf-scene"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'section', 
      mergeAttributes(HTMLAttributes, { 
        'data-type': 'uf-scene',
        class: `uf-scene uf-scene--${HTMLAttributes.padding}` 
      }), 
      0
    ];
  },
});