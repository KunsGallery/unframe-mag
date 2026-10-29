// Instagram share cards drawn on a 2D canvas: pure layout helpers plus one draw pass.
// Sizes follow Instagram's upload targets; story text stays inside its UI-safe band.

export const SHARE_CARD_FORMATS = {
  post: { label: "게시글 4:5", width: 1080, height: 1350, safeTop: 96, safeBottom: 96 },
  story: { label: "스토리 9:16", width: 1080, height: 1920, safeTop: 250, safeBottom: 300 },
};
export const SHARE_CARD_STYLES = { photo: "사진", text: "글자" };
export const SHARE_CARD_QUOTE_MAX = 280;

const FONT = '"Pretendard", system-ui, sans-serif';
const BRAND = "#004aad";
const MARGIN = 88;

const normalizeQuote = (value) => String(value || "")
  .replace(/\r\n?/g, "\n")
  .replace(/[ \t\u00a0]+/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

// Selection or excerpt → card text, clipped on a word boundary.
export function prepareQuote(value, max = SHARE_CARD_QUOTE_MAX) {
  const text = normalizeQuote(value).replace(/^["“”'‘’「『]+|["“”'‘’」』]+$/g, "").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, Math.max(0, max - 1));
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
}

// Greedy line breaking that keeps Korean words whole (like `word-break: keep-all`)
// and only splits a single word when it is wider than the line.
export function wrapText(measure, text, maxWidth) {
  const lines = [];
  for (const paragraph of String(text || "").split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ").filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth) { line = candidate; continue; }
      if (line) lines.push(line);
      line = "";
      if (measure(word) <= maxWidth) { line = word; continue; }
      for (const char of word) {
        if (line && measure(line + char) > maxWidth) { lines.push(line); line = ""; }
        line += char;
      }
    }
    lines.push(line);
  }
  while (lines.length > 1 && !lines[lines.length - 1]) lines.pop();
  return lines;
}

// Trims the last kept line until the ellipsis fits.
export function clampLines(measure, lines, maxLines, maxWidth) {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && measure(`${last}…`) > maxWidth) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

// Largest font size whose wrapped text fits the box; falls back to clamping at the minimum.
export function fitText(ctx, text, { maxWidth, maxHeight, maxSize, minSize, weight = 700, lineHeight = 1.42, step = 4 }) {
  for (let size = maxSize; size >= minSize; size -= step) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    const lines = wrapText((value) => ctx.measureText(value).width, text, maxWidth);
    if (lines.length * size * lineHeight <= maxHeight) return { size, lines, lineHeight: size * lineHeight };
  }
  ctx.font = `${weight} ${minSize}px ${FONT}`;
  const measure = (value) => ctx.measureText(value).width;
  const maxLines = Math.max(1, Math.floor(maxHeight / (minSize * lineHeight)));
  return { size: minSize, lines: clampLines(measure, wrapText(measure, text, maxWidth), maxLines, maxWidth), lineHeight: minSize * lineHeight };
}

function drawCover(ctx, image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
}

function drawLines(ctx, lines, x, y, lineHeight) {
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

/**
 * Draws one card. `image` is an already-decoded, CORS-clean image (or null).
 * Layout: brand row at the top, quote and title anchored to the bottom (photo)
 * or centred (text), site footer last.
 */
export function drawShareCard(ctx, { format = "post", style = "text", quote = "", title = "", categoryNumber = null, category = "", image = null } = {}) {
  const spec = SHARE_CARD_FORMATS[format] || SHARE_CARD_FORMATS.post;
  const { width, height, safeTop, safeBottom } = spec;
  const usePhoto = style === "photo" && !!image;
  const innerWidth = width - MARGIN * 2;
  const top = safeTop + 24;
  const bottom = height - safeBottom - 24;

  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  if (usePhoto) {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);
    drawCover(ctx, image, width, height);
    const shade = ctx.createLinearGradient(0, 0, 0, height);
    shade.addColorStop(0, "rgba(0,0,0,0.45)");
    shade.addColorStop(0.22, "rgba(0,0,0,0.05)");
    shade.addColorStop(0.45, "rgba(0,0,0,0.25)");
    shade.addColorStop(1, "rgba(0,0,0,0.88)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = BRAND;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.fillStyle = "#fff";

  // Brand row.
  ctx.font = `italic 900 40px ${FONT}`;
  ctx.fillText("U#", MARGIN, top);
  ctx.font = `700 24px ${FONT}`;
  ctx.globalAlpha = 0.85;
  const meta = [category, categoryNumber ? `No.${categoryNumber}` : ""].filter(Boolean).join("  ·  ").toUpperCase();
  ctx.textAlign = "right";
  ctx.fillText(meta, width - MARGIN, top + 10);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;

  // Footer.
  const footerY = bottom - 30;
  ctx.font = `600 26px ${FONT}`;
  ctx.globalAlpha = 0.8;
  ctx.fillText("magazine.unframe.kr", MARGIN, footerY);
  ctx.textAlign = "right";
  ctx.fillText("@unframe.kr", width - MARGIN, footerY);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;

  // Title block (fixed size, up to 2 lines) sits just above the footer.
  ctx.font = `700 40px ${FONT}`;
  const titleMeasure = (value) => ctx.measureText(value).width;
  const titleLines = title ? clampLines(titleMeasure, wrapText(titleMeasure, title, innerWidth), 2, innerWidth) : [];
  const titleLineHeight = 54;
  const titleHeight = titleLines.length * titleLineHeight;
  const titleY = footerY - 64 - titleHeight;

  // Quote fills the space between the brand row and the title.
  const quoteTop = usePhoto ? top + (format === "story" ? 520 : 360) : top + 150;
  const quoteBottom = titleY - (titleLines.length ? 56 : 0);
  const fitted = quote
    ? fitText(ctx, `“${quote}”`, { maxWidth: innerWidth, maxHeight: Math.max(80, quoteBottom - quoteTop), maxSize: format === "story" ? 76 : 68, minSize: 34 })
    : null;

  if (fitted) {
    const blockHeight = fitted.lines.length * fitted.lineHeight;
    // Photo cards keep text low over the gradient; text cards centre the quote.
    const quoteY = usePhoto ? quoteBottom - blockHeight : Math.max(quoteTop, quoteTop + (quoteBottom - quoteTop - blockHeight) / 2);
    ctx.font = `700 ${fitted.size}px ${FONT}`;
    drawLines(ctx, fitted.lines, MARGIN, quoteY, fitted.lineHeight);
  }

  if (titleLines.length) {
    ctx.fillRect(MARGIN, titleY - 28, 64, 4);
    ctx.font = `700 40px ${FONT}`;
    ctx.globalAlpha = 0.92;
    drawLines(ctx, titleLines, MARGIN, titleY, titleLineHeight);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function loadCardImage(src, { timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const image = new Image();
    const finish = (result) => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(result);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    // Cloudinary sends CORS headers; without them the canvas would be tainted and unexportable.
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = src;
  });
}

export async function ensureCardFonts() {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  let timer;
  try {
    await Promise.race([
      Promise.all(["400", "600", "700", "900"].map((weight) => document.fonts.load(`${weight} 40px "Pretendard"`, "가A"))),
      new Promise((resolve) => { timer = setTimeout(resolve, 4000); }),
    ]);
  } catch {
    // Fall back to system fonts.
  } finally {
    clearTimeout(timer);
  }
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("share-card-export"))), "image/png");
  });
}

export function shareCardFileName({ editionNo, format }) {
  return `unframe-${editionNo || "article"}-${format === "story" ? "story" : "post"}.png`;
}
