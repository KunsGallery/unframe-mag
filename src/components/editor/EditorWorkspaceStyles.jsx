// 편집 화면 전용 본문/블록 스타일
export default function EditorWorkspaceStyles() {
  return (
    <style data-uf-editor-styles>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .uf-title-textarea,
        .uf-subtitle-textarea {
          overflow: hidden;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--uf-muted);
          pointer-events: none;
          height: 0;
        }

        .ProseMirror.uf-editor {
          min-height: 500px;
          outline: none;
        }

        .uf-editor,
        .uf-prose{
          color: inherit;
          font-style: normal;
          font-weight: 300;
          font-size: 18px;
          line-height: 1.95;
          letter-spacing: 0.01em;
          word-break: keep-all;
          overflow-wrap: break-word;
        }

        .uf-editor p,
        .uf-prose p{
          margin: 0 0 1.6em;
        }

        .uf-editor h1,
        .uf-editor h2,
        .uf-editor h3,
        .uf-prose h1,
        .uf-prose h2,
        .uf-prose h3{
          font-style: italic;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin: 1.2em 0 0.5em;
        }

        .uf-editor h1,
        .uf-prose h1{ font-size: 3.4rem; }

        .uf-editor h2,
        .uf-prose h2{ font-size: 2.4rem; }

        .uf-editor h3,
        .uf-prose h3{ font-size: 1.7rem; }

        .uf-editor blockquote,
        .uf-prose blockquote{
          margin: 2em 0;
          padding-left: 1.25em;
          border-left: 1px solid rgba(0, 74, 173, 0.72);
          font-style: italic;
        }

        .uf-editor ul,
        .uf-editor ol,
        .uf-prose ul,
        .uf-prose ol{
          margin: 0 0 1.6em 1.25em;
          padding-left: 1.1em;
        }

        .uf-editor li,
        .uf-prose li{
          margin: 0.35em 0;
        }

        .uf-editor hr,
        .uf-prose hr{
          margin: 3em 0;
          border: 0;
          border-top: 1px solid rgba(113,113,122,.25);
        }

        .uf-editor img, .uf-prose img{
          display: block;
          max-width: 100%;
          height: auto;
        }

        /* ===== Editor-only UfImage overrides ===== */
        .uf-editor .uf-img {
          width: 100%;
          max-width: 100%;
        }

        .uf-editor .uf-img.is-xsmall {
          max-width: 320px;
        }

        .uf-editor .uf-img.is-small {
          max-width: 460px;
        }

        .uf-editor .uf-img.is-normal {
          max-width: 720px;
        }

        .uf-editor .uf-img.is-wide {
          max-width: min(900px, 100%);
        }

        /* ✅ 에디터에서는 full도 편집 영역 안에서만 */
        .uf-editor .uf-img.is-full {
          width: 100%;
          max-width: 100%;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        /* ✅ 정렬이 눈에 띄게 보이도록 wrapper 기준으로 처리 */
        .uf-editor .uf-img.align-left {
          margin-left: 0;
          margin-right: auto;
        }

        .uf-editor .uf-img.align-center {
          margin-left: auto;
          margin-right: auto;
        }

        .uf-editor .uf-img.align-right {
          margin-left: auto;
          margin-right: 0;
        }

        /* 에디터 안에서는 정렬 확인이 잘 되도록 살짝 가이드 */
        .uf-editor .uf-img.align-left,
        .uf-editor .uf-img.align-center,
        .uf-editor .uf-img.align-right {
          transition: opacity .18s ease, transform .18s ease;
        }

        .uf-editor pre,
        .uf-prose pre{
          margin: 1.8em 0;
          padding: 1.1em 1.2em;
          border-radius: 16px;
          overflow-x: auto;
        }

        .uf-editor :last-child,
        .uf-prose :last-child{
          margin-bottom: 0;
        }

        .uf-editor :is(p, h1, h2, h3, blockquote, ul, ol, pre){
          position: relative;
        }

        .uf-editor :is(p, h1, h2, h3, blockquote, ul, ol, pre):hover::before{
          content: "⋮⋮";
          position: absolute;
          left: -28px;
          top: .2rem;
          font-size: 14px;
          letter-spacing: 2px;
          opacity: .35;
          color: #004aad;
        }

        .uf-editor .uf-divider,
        .uf-prose .uf-divider{
          width: 100%;
          margin: 3em 0;
          position: relative;
        }

        .uf-editor .uf-divider.is-line,
        .uf-prose .uf-divider.is-line{
          height: 1px;
          background: rgba(113,113,122,.25);
        }

        .uf-editor .uf-divider.is-dashed,
        .uf-prose .uf-divider.is-dashed{
          height: 0;
          border-top: 1px dashed rgba(113,113,122,.35);
        }

        .uf-editor .uf-divider.is-double,
        .uf-prose .uf-divider.is-double{
          height: 8px;
          border-top: 1px solid rgba(113,113,122,.28);
          border-bottom: 1px solid rgba(113,113,122,.28);
        }

        .uf-editor .uf-divider.is-dots,
        .uf-prose .uf-divider.is-dots{
          height: 10px;
          background:
            radial-gradient(circle, rgba(113,113,122,.45) 1.5px, transparent 1.7px)
            center / 14px 10px repeat-x;
        }

        .uf-editor .uf-divider.is-fade,
        .uf-prose .uf-divider.is-fade{
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(113,113,122,.38), transparent);
        }

        .uf-editor .uf-divider.is-glow,
        .uf-prose .uf-divider.is-glow{
          height: 2px;
          background: linear-gradient(90deg, transparent, #004aad, transparent);
          box-shadow: 0 0 18px rgba(0,74,173,.35);
        }

        .uf-editor .uf-divider.is-space,
        .uf-prose .uf-divider.is-space{
          height: 48px;
        }

        .uf-editor .uf-callout,
        .uf-prose .uf-callout{
          margin: 2.2em 0;
          padding: 1.2em 1.2em 1.15em;
          border: 1px solid rgba(113,113,122,.18);
          border-radius: 22px;
          background: rgba(255,255,255,.55);
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
        }

        .dark .uf-editor .uf-callout,
        .dark .uf-prose .uf-callout{
          background: rgba(24,24,27,.62);
          border-color: rgba(255,255,255,.08);
        }

        .uf-editor .uf-callout::before,
        .uf-prose .uf-callout::before{
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: rgba(0,74,173,.7);
        }

        .uf-editor .uf-callout__label,
        .uf-prose .uf-callout__label{
          margin-bottom: .8em;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .28em;
          text-transform: uppercase;
          color: #004aad;
        }

        .uf-editor .uf-callout__body > :last-child,
        .uf-prose .uf-callout__body > :last-child{
          margin-bottom: 0;
        }

        .uf-editor .uf-callout.is-note,
        .uf-prose .uf-callout.is-note{
          background: rgba(255,255,255,.58);
          border-color: rgba(113,113,122,.16);
        }
        .dark .uf-editor .uf-callout.is-note,
        .dark .uf-prose .uf-callout.is-note{
          background: rgba(24,24,27,.62);
        }
        .uf-editor .uf-callout.is-note::before,
        .uf-prose .uf-callout.is-note::before{
          background: rgba(0,74,173,.72);
        }
        .uf-editor .uf-callout.is-note .uf-callout__label,
        .uf-prose .uf-callout.is-note .uf-callout__label{
          color: #004aad;
        }

        .uf-editor .uf-callout.is-point,
        .uf-prose .uf-callout.is-point{
          background: linear-gradient(180deg, rgba(0,74,173,.08), rgba(255,255,255,.7));
          border-color: rgba(0,74,173,.24);
          box-shadow: 0 10px 30px rgba(0,74,173,.08);
        }
        .dark .uf-editor .uf-callout.is-point,
        .dark .uf-prose .uf-callout.is-point{
          background: linear-gradient(180deg, rgba(0,74,173,.18), rgba(24,24,27,.72));
          border-color: rgba(0,74,173,.24);
        }
        .uf-editor .uf-callout.is-point::before,
        .uf-prose .uf-callout.is-point::before{
          background: #004aad;
        }
        .uf-editor .uf-callout.is-point .uf-callout__label,
        .uf-prose .uf-callout.is-point .uf-callout__label{
          color: #004aad;
        }

        .uf-editor .uf-callout.is-info,
        .uf-prose .uf-callout.is-info{
          background: linear-gradient(180deg, rgba(16,185,129,.06), rgba(255,255,255,.68));
          border-color: rgba(16,185,129,.24);
        }
        .dark .uf-editor .uf-callout.is-info,
        .dark .uf-prose .uf-callout.is-info{
          background: linear-gradient(180deg, rgba(16,185,129,.12), rgba(24,24,27,.72));
          border-color: rgba(16,185,129,.22);
        }
        .uf-editor .uf-callout.is-info::before,
        .uf-prose .uf-callout.is-info::before{
          background: rgba(16,185,129,.85);
        }
        .uf-editor .uf-callout.is-info .uf-callout__label,
        .uf-prose .uf-callout.is-info .uf-callout__label{
          color: rgba(5,150,105,1);
        }

        .uf-editor .uf-callout.is-quote,
        .uf-prose .uf-callout.is-quote{
          background: rgba(244,244,245,.72);
          border-color: rgba(113,113,122,.18);
        }
        .dark .uf-editor .uf-callout.is-quote,
        .dark .uf-prose .uf-callout.is-quote{
          background: rgba(39,39,42,.82);
        }
        .uf-editor .uf-callout.is-quote::before,
        .uf-prose .uf-callout.is-quote::before{
          background: rgba(161,161,170,.9);
        }
        .uf-editor .uf-callout.is-quote .uf-callout__label,
        .uf-prose .uf-callout.is-quote .uf-callout__label{
          color: rgba(113,113,122,1);
        }
        .uf-editor .uf-callout.is-quote .uf-callout__body,
        .uf-prose .uf-callout.is-quote .uf-callout__body{
          font-style: italic;
        }

                /* ===== Editor-only Columns visibility ===== */
        .uf-editor .uf-columns {
          position: relative;
          display: grid;
          gap: var(--uf-columns-gap, 24px);
          margin: 2.2rem 0;
          padding: 14px;
          border: 1px dashed rgba(0, 74, 173, 0.28);
          border-radius: 20px;
          background: rgba(0, 74, 173, 0.03);
        }

        .dark .uf-editor .uf-columns {
          border-color: rgba(125, 181, 255, 0.22);
          background: rgba(0, 74, 173, 0.08);
        }

        .uf-editor .uf-columns[data-columns="2"] {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .uf-editor .uf-columns[data-columns="3"] {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .uf-editor .uf-columns[data-valign="center"] {
          align-items: center;
        }

        .uf-editor .uf-column {
          min-width: 0;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.68);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-sizing: border-box;
        }

        .dark .uf-editor .uf-column {
          background: rgba(24, 24, 27, 0.72);
          border-color: rgba(255, 255, 255, 0.06);
        }

        .uf-editor .uf-column > :first-child {
          margin-top: 0;
        }

        .uf-editor .uf-column > :last-child {
          margin-bottom: 0;
        }
      `}</style>
  );
}
