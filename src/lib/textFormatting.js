// Shared inline-formatting vocabulary for the toolbar, the selection bubble and presets.
// Colours are CSS variables so they stay readable in dark mode.

export const DEFAULT_TEXT_SIZE_PX = 18;

// The size dropdown's choices (px, as the editor has always offered); null = the paragraph's own size.
export const TEXT_SIZE_OPTIONS = [null, "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px"];
const SIZE_STEPS_PX = TEXT_SIZE_OPTIONS.filter(Boolean).map((value) => parseFloat(value));

export const TEXT_COLORS = [
  { label: "기본", value: null },
  { label: "회색", value: "var(--uf-ink-gray)" },
  { label: "블루", value: "var(--uf-ink-blue)" },
  { label: "빨강", value: "var(--uf-ink-red)" },
  { label: "주황", value: "var(--uf-ink-orange)" },
  { label: "초록", value: "var(--uf-ink-green)" },
  { label: "보라", value: "var(--uf-ink-purple)" },
];

export const HIGHLIGHT_COLORS = [
  { label: "노랑", value: "var(--uf-mark-yellow)" },
  { label: "분홍", value: "var(--uf-mark-pink)" },
  { label: "초록", value: "var(--uf-mark-green)" },
  { label: "파랑", value: "var(--uf-mark-blue)" },
  { label: "보라", value: "var(--uf-mark-purple)" },
];

const SERIF = '"Noto Serif KR", serif';

export const TEXT_STYLE_PRESETS = [
  { id: "emphasis", label: "강조", hint: "블루 · 굵게", marks: { color: "var(--uf-ink-blue)", bold: true } },
  { id: "large", label: "크게", hint: "28 · 굵게", marks: { fontSize: "28px", bold: true } },
  { id: "small", label: "작은 글씨", hint: "14 · 회색", marks: { fontSize: "14px", color: "var(--uf-ink-gray)" } },
  { id: "serif", label: "세리프 인용", hint: "명조 · 24 · 기울임", marks: { fontFamily: SERIF, fontSize: "24px", italic: true } },
  { id: "marker", label: "형광 강조", hint: "노란 형광펜 · 굵게", marks: { highlight: "var(--uf-mark-yellow)", bold: true } },
];

// Marks that "서식 지우기" and the format painter treat as formatting (links and footnotes stay).
export const FORMAT_MARKS = ["textStyle", "bold", "italic", "underline", "strike", "highlight", "code", "superscript", "subscript"];

// "1.25em" → 1.25, "24px" → 24/18, null → 1.
export function textSizeRatio(value) {
  const text = String(value || "").trim();
  if (!text) return 1;
  const number = parseFloat(text);
  if (!Number.isFinite(number) || number <= 0) return 1;
  if (text.endsWith("px")) return number / DEFAULT_TEXT_SIZE_PX;
  if (text.endsWith("rem") || text.endsWith("em")) return number;
  if (text.endsWith("%")) return number / 100;
  return 1;
}

// Approximate px for any stored size (relative sizes from earlier drafts included).
export function textSizePx(value) {
  return Math.round(textSizeRatio(value) * DEFAULT_TEXT_SIZE_PX);
}

export function textSizeLabel(value) {
  if (!value) return "기본";
  return String(value).endsWith("px") ? String(parseFloat(value)) : String(value);
}

// ⌘⇧. / ⌘⇧, move to the next dropdown size up or down.
export function stepTextSize(current, direction) {
  const px = textSizePx(current);
  const next = direction > 0 ? SIZE_STEPS_PX.find((step) => step > px) : [...SIZE_STEPS_PX].reverse().find((step) => step < px);
  return next ? `${next}px` : current || null;
}

// Pressing a control must not move focus out of the editor, or the selection is lost on touch devices.
export const keepEditorSelection = (event) => event.preventDefault();

export function setTextSize(editor, value) {
  const chain = editor.chain().focus();
  return (value ? chain.setFontSize(value) : chain.unsetFontSize()).run();
}

export function clearFormatting(chain, schema) {
  FORMAT_MARKS.forEach((name) => { if (schema.marks[name]) chain.unsetMark(name, { extendEmptyMarkRange: true }); });
  return chain;
}

export function applyTextPreset(editor, preset) {
  const { marks } = preset;
  const chain = clearFormatting(editor.chain().focus(), editor.schema);
  if (marks.fontSize) chain.setFontSize(marks.fontSize);
  if (marks.color) chain.setColor(marks.color);
  if (marks.fontFamily) chain.setFontFamily(marks.fontFamily);
  if (marks.highlight) chain.setHighlight({ color: marks.highlight });
  if (marks.bold) chain.setBold();
  if (marks.italic) chain.setItalic();
  return chain.run();
}

// Format painter: the formatting marks at the start of the selection, link excluded.
export function copyFormatting(state) {
  const { $from, empty } = state.selection;
  const marks = empty ? state.storedMarks || $from.marks() : (state.doc.nodeAt($from.pos)?.marks || $from.marks());
  return marks.filter((mark) => FORMAT_MARKS.includes(mark.type.name)).map((mark) => ({ type: mark.type.name, attrs: { ...mark.attrs } }));
}

export function pasteFormatting(editor, marks) {
  const { from, to, empty } = editor.state.selection;
  if (empty) return false;
  return editor.chain().focus().command(({ tr, state }) => {
    FORMAT_MARKS.forEach((name) => { const type = state.schema.marks[name]; if (type) tr.removeMark(from, to, type); });
    marks.forEach(({ type, attrs }) => { const markType = state.schema.marks[type]; if (markType) tr.addMark(from, to, markType.create(attrs)); });
    return true;
  }).run();
}

export function hasFormatting(state) {
  const { from, to, empty } = state.selection;
  if (empty) return false;
  let found = false;
  state.doc.nodesBetween(from, to, (node) => {
    if (found) return false;
    if (node.isText && node.marks.some((mark) => FORMAT_MARKS.includes(mark.type.name))) found = true;
    return !found;
  });
  return found;
}
