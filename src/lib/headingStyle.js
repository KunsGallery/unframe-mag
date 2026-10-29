// Per-article typography for the hero title and subtitle, set in the editor preview.
// Stored as { title?: Part, subtitle?: Part } with Part = { desktop, mobile, tracking, leading }.
// Sizes are px per viewport (mobile = 800px wide or less); tracking is em; leading is unitless.

export const HEADING_PARTS = {
  title: { label: "제목", size: [20, 120], defaults: { desktop: 42, mobile: 30, tracking: 0, leading: 1.35 } },
  subtitle: { label: "부제", size: [12, 48], defaults: { desktop: 20, mobile: 14, tracking: 0, leading: 1.625 } },
};
export const TRACKING_RANGE = [-0.1, 0.3];
export const LEADING_RANGE = [0.9, 2.4];

const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value));
const number = (value) => (value === null || value === undefined || value === "" ? NaN : Number(value));
const round = (value, step) => Math.round(value / step) * step;

function normalizePart(value, spec) {
  if (!value || typeof value !== "object") return null;
  const part = {};
  for (const key of ["desktop", "mobile"]) {
    const size = number(value[key]);
    if (Number.isFinite(size)) part[key] = Math.round(clamp(size, spec.size));
  }
  const tracking = number(value.tracking);
  if (Number.isFinite(tracking)) part.tracking = Number(round(clamp(tracking, TRACKING_RANGE), 0.005).toFixed(3));
  const leading = number(value.leading);
  if (Number.isFinite(leading)) part.leading = Number(round(clamp(leading, LEADING_RANGE), 0.05).toFixed(2));
  return Object.keys(part).length ? part : null;
}

export function normalizeHeadingStyle(value) {
  const style = {};
  for (const [key, spec] of Object.entries(HEADING_PARTS)) {
    const part = normalizePart(value?.[key], spec);
    if (part) style[key] = part;
  }
  return style;
}

// Effective values with defaults filled in, for the controls.
export function resolveHeadingPart(style, key) {
  return { ...HEADING_PARTS[key].defaults, ...(normalizeHeadingStyle(style)[key] || {}) };
}

// Props for the hero element: CSS variables read by .uf-article-title / .uf-article-subtitle
// (view.css), so the default responsive sizes apply until a size is set.
export function headingStyleProps(style, key) {
  const part = normalizeHeadingStyle(style)[key];
  if (!part) return {};
  const css = {};
  if (part.desktop) css["--uf-heading-size"] = `${part.desktop}px`;
  if (part.mobile) css["--uf-heading-size-mobile"] = `${part.mobile}px`;
  if (part.tracking !== undefined) css.letterSpacing = `${part.tracking}em`;
  if (part.leading !== undefined) css.lineHeight = part.leading;
  return {
    style: css,
    "data-size": part.desktop ? "" : undefined,
    "data-size-mobile": part.mobile ? "" : undefined,
  };
}

export function updateHeadingPart(style, key, changes) {
  const next = { ...normalizeHeadingStyle(style) };
  next[key] = { ...(next[key] || {}), ...changes };
  return normalizeHeadingStyle(next);
}

export function resetHeadingPart(style, key) {
  const next = { ...normalizeHeadingStyle(style) };
  delete next[key];
  return next;
}
