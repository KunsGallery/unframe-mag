import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { articleImageAttributes } from '../../lib/imageUrl';

export const ResponsiveImage = Image.extend({
  addAttributes() {
    const parent = this.parent?.() || {};
    return { ...parent, src: { ...parent.src, parseHTML: (element) => element.getAttribute('data-original-src') || element.getAttribute('src') } };
  },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, articleImageAttributes(HTMLAttributes.src))];
  },
});
