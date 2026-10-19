import React, { useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useEditor } from '@tiptap/react';
import { createEditorConfig } from '../src/tiptap/editorConfig';
import { useSlideGalleryRuntime } from '../src/hooks/useSlideGalleryRuntime';
import ArticleBody from '../src/components/view/ArticleBody';
import '../src/styles/index.css';
import '../src/styles/article-runtime.css';

export function Fixture() {
  const ref = useRef(null);
  const config = useMemo(() => ({ ...createEditorConfig({}), editable: false, editorProps: { attributes: { class: 'ProseMirror uf-prose uf-view' } }, content: {
    type: 'doc', content: [
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '이미지 로딩 검수' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '정상 사진, 로딩 실패, 갤러리와 캡션을 확인합니다.' }] },
      { type: 'gallery', attrs: { columns: 2, images: [{ src: '/icons/icon-512.png', caption: '정상 이미지' }, { src: '/missing-photo.jpg', caption: '유지되는 캡션' }] } },
      { type: 'slideGallery', attrs: { imageHeight: 280, images: [{ src: '/missing-slide.jpg', caption: '첫 번째 슬라이드' }, { src: '/icons/icon-512.png', caption: '두 번째 슬라이드' }] } },
      { type: 'ufImage', attrs: { src: '/missing-single.jpg', caption: '단일 이미지 캡션' } },
    ],
  } }), []);
  const editor = useEditor(config);
  useSlideGalleryRuntime(ref, editor);
  return <main style={{ maxWidth: 900, margin: 'auto', padding: 24 }}><ArticleBody ref={ref} editor={editor} article={{ title: '검수' }} /></main>;
}
if (!import.meta.env.DEV) throw new Error('Development fixture only');
createRoot(document.getElementById('root')).render(<Fixture />);
