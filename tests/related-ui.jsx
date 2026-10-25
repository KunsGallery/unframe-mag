import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { db } from '../src/firebase/config';
import RelatedArticlesPicker from '../src/components/editor/RelatedArticlesPicker';
import RelatedArticles, { ParentArticleLink } from '../src/components/view/RelatedArticles';
import '../src/styles/index.css';
import '../src/styles/editor-workspace.css';

const cover = '/icons/icon-512.png';
const parent = { editionNo: '010', title: '단체전 《여름의 목소리》', category: 'EXHIBITION', coverMedium: cover };
const items = [
  { editionNo: '011', title: '작가 A — 빛을 다루는 방식', subtitle: '디렉터 노트', category: "CURATOR'S NOTE", coverMedium: cover },
  { editionNo: '012', title: '작가 B — 오래된 재료의 새 이름', category: "CURATOR'S NOTE" },
];

export function Fixture() {
  const [related, setRelated] = useState(['004']);
  return (
    <BrowserRouter>
      <main style={{ maxWidth: 1100, margin: 'auto', padding: 24, display: 'grid', gridTemplateColumns: '340px 1fr', gap: 32 }}>
        <section className="uf-document-settings" data-testid="picker">
          <RelatedArticlesPicker db={db} value={related} onChange={setRelated} selfEditionNo="006" disabled={false} />
          <output data-testid="value">{related.join(',')}</output>
        </section>
        <section>
          <h2>메인 글 하단</h2>
          <RelatedArticles parent={null} items={items} />
          <h2 style={{ marginTop: 48 }}>작가 글 상단·하단</h2>
          <ParentArticleLink parent={parent} />
          <RelatedArticles parent={parent} items={items.slice(1)} />
        </section>
      </main>
    </BrowserRouter>
  );
}
if (!import.meta.env.DEV) throw new Error('Development fixture only');
createRoot(document.getElementById('root')).render(<React.StrictMode><Fixture /></React.StrictMode>);
