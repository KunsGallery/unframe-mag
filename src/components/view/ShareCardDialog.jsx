import { useEffect, useId, useRef, useState } from "react";
import { Download, Link2, Share } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { getCoverImageUrl } from "../../lib/imageUrl";
import {
  SHARE_CARD_FORMATS,
  SHARE_CARD_STYLES,
  SHARE_CARD_QUOTE_MAX,
  canvasToBlob,
  drawShareCard,
  ensureCardFonts,
  loadCardImage,
  prepareQuote,
  shareCardFileName,
} from "../../lib/shareCard";

const canShareFiles = (file) => {
  try { return !!navigator.canShare?.({ files: [file] }); } catch { return false; }
};

// Share sheet: link sharing plus Instagram-sized image cards.
// Mounted per request (keyed), so the initial quote comes straight from props.
export default function ShareCardDialog({ article, initialQuote = "", onClose, onShareLink, onShared, onToast }) {
  const dialog = useRef(null);
  const canvas = useRef(null);
  const heading = useId();
  const [format, setFormat] = useState("post");
  const [quote, setQuote] = useState(() => prepareQuote(initialQuote));
  const [cover, setCover] = useState({ status: "loading", image: null });
  const [style, setStyle] = useState("photo");
  const [fontsReady, setFontsReady] = useState(false);
  const [exported, setExported] = useState({ key: "", file: null });
  const [busy, setBusy] = useState(false);
  const [categoryNumber, setCategoryNumber] = useState({ status: "loading", value: null });

  useEffect(() => { if (dialog.current && !dialog.current.open) dialog.current.showModal(); }, []);

  useEffect(() => {
    let alive = true;
    ensureCardFonts().then(() => { if (alive) setFontsReady(true); });
    loadCardImage(getCoverImageUrl(article, { width: 1600, format: "jpg" }))
      .then((image) => { if (alive) setCover({ status: image ? "ready" : "none", image }); });
    return () => { alive = false; };
  }, [article]);

  useEffect(() => {
    let alive = true;
    if (!article.category || !Number.isFinite(article.sortIndex)) {
      setCategoryNumber({ status: "ready", value: null });
      return () => { alive = false; };
    }
    setCategoryNumber({ status: "loading", value: null });
    const earlier = query(collection(db, "articles"), where("status", "==", "published"), where("sortIndex", "<=", article.sortIndex));
    const timer = setTimeout(() => {
      if (alive) { alive = false; setCategoryNumber({ status: "ready", value: null }); }
    }, 8000);
    getDocs(earlier).then((snapshot) => {
      if (!alive) return;
      clearTimeout(timer);
      const count = snapshot.docs.filter((entry) => entry.data().category === article.category).length;
      setCategoryNumber({ status: "ready", value: count || null });
    }).catch(() => {
      clearTimeout(timer);
      if (alive) setCategoryNumber({ status: "ready", value: null });
    });
    return () => { alive = false; clearTimeout(timer); };
  }, [article.category, article.sortIndex]);

  const effectiveStyle = cover.status === "none" ? "text" : style;
  const spec = SHARE_CARD_FORMATS[format];
  const cardKey = `${format}|${effectiveStyle}|${prepareQuote(quote)}|${cover.status}|${categoryNumber.status}|${categoryNumber.value}`;
  // Only the export that matches what is on screen can be shared.
  const file = exported.key === cardKey ? exported.file : null;

  // Draw, then export ahead of time: Safari only allows navigator.share() directly
  // inside the tap, so the file has to exist before the button is pressed.
  useEffect(() => {
    const element = canvas.current;
    if (!element || !fontsReady || cover.status === "loading" || categoryNumber.status === "loading") return undefined;
    let alive = true;
    element.width = spec.width;
    element.height = spec.height;
    drawShareCard(element.getContext("2d"), {
      format,
      style: effectiveStyle,
      quote: prepareQuote(quote),
      title: article.title || "",
      categoryNumber: categoryNumber.value,
      category: article.category || "",
      image: cover.image,
    });
    const timer = setTimeout(() => {
      canvasToBlob(element)
        .then((blob) => { if (alive) setExported({ key: cardKey, file: new File([blob], shareCardFileName({ editionNo: article.editionNo, format }), { type: "image/png" }) }); })
        .catch(() => { if (alive) setExported({ key: cardKey, file: null, error: true }); });
    }, 200);
    return () => { alive = false; clearTimeout(timer); };
  }, [article, cardKey, categoryNumber, cover, effectiveStyle, fontsReady, format, quote, spec]);

  const close = () => { dialog.current?.close(); onClose(); };

  const download = (current) => {
    const url = URL.createObjectURL(current);
    const link = document.createElement("a");
    link.href = url;
    link.download = current.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    onShared?.("card-download");
  };

  const shareImage = async () => {
    const current = file;
    if (!current || busy) return;
    if (!canShareFiles(current)) { download(current); onToast?.("이미지를 저장했어요. 인스타그램에서 불러와 올려 주세요."); return; }
    setBusy(true);
    try {
      await navigator.share({ files: [current], title: article.title || "UNFRAME" });
      onShared?.("card-share");
    } catch (error) {
      if (error?.name !== "AbortError") { download(current); onToast?.("바로 공유하지 못해 이미지를 저장했어요."); }
    } finally {
      setBusy(false);
    }
  };

  const preview = format === "story" ? "uf-share-card__preview is-story" : "uf-share-card__preview";
  return (
    <dialog ref={dialog} aria-labelledby={heading} className="uf-share-card" onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === dialog.current) close(); }}>
      <div className="uf-share-card__body">
        <header>
          <h2 id={heading}>공유하기</h2>
          <button type="button" onClick={close} aria-label="닫기">닫기</button>
        </header>

        <button type="button" className="uf-share-card__link" onClick={() => onShareLink?.()}>
          <Link2 size={16} aria-hidden="true" /> 링크 공유하기
        </button>

        <div className="uf-share-card__grid">
          <div className={preview}>
            <canvas ref={canvas} role="img" aria-label={`${spec.label} 공유 카드 미리보기`} />
            {!fontsReady || cover.status === "loading" || categoryNumber.status === "loading" ? <span className="uf-share-card__loading">카드를 만드는 중…</span> : null}
          </div>

          <div className="uf-share-card__controls">
            <fieldset>
              <legend>크기</legend>
              <div className="uf-share-card__segment">
                {Object.entries(SHARE_CARD_FORMATS).map(([key, value]) => (
                  <button key={key} type="button" aria-pressed={format === key} onClick={() => setFormat(key)}>{value.label}</button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>디자인</legend>
              <div className="uf-share-card__segment">
                {Object.entries(SHARE_CARD_STYLES).map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={effectiveStyle === key} disabled={key === "photo" && cover.status === "none"}
                    title={key === "photo" && cover.status === "none" ? "대표사진을 불러오지 못했어요" : undefined}
                    onClick={() => setStyle(key)}>{label}</button>
                ))}
              </div>
            </fieldset>
            <label className="uf-share-card__quote">카드 문장
              <textarea rows={5} maxLength={SHARE_CARD_QUOTE_MAX} value={quote} placeholder="카드에 넣을 문장을 적어 주세요."
                onChange={(event) => setQuote(event.target.value)} />
              <small>{quote.length}/{SHARE_CARD_QUOTE_MAX} · 본문에서 문장을 드래그하면 그 문장으로 카드를 만들 수 있어요.</small>
            </label>

            {exported.key === cardKey && exported.error ? <p role="alert">이미지를 만들지 못했어요. 글자 디자인으로 바꾸거나 공유 창을 다시 열어 주세요.</p> : null}
            <footer>
              <button type="button" disabled={!file} onClick={() => file && download(file)}>
                <Download size={16} aria-hidden="true" /> 이미지 저장
              </button>
              <button type="button" className="uf-primary" disabled={!file || busy} onClick={shareImage}>
                <Share size={16} aria-hidden="true" /> 이미지 공유
              </button>
            </footer>
          </div>
        </div>
      </div>
    </dialog>
  );
}
