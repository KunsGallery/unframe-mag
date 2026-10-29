import { useEffect, useRef, useState } from "react";
import { ChevronDown, Highlighter, Sparkles } from "lucide-react";
import {
  HIGHLIGHT_COLORS,
  TEXT_COLORS,
  TEXT_SIZE_OPTIONS,
  TEXT_STYLE_PRESETS,
  applyTextPreset,
  keepEditorSelection,
  setTextSize,
  textSizeLabel,
} from "../../lib/textFormatting";

export function FormatButton({ label, shortcut, active = false, disabled = false, onClick, children, className = "" }) {
  return (
    <button type="button" className={`uf-fmt-btn ${className}`} aria-label={label} aria-pressed={active} title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled} onMouseDown={keepEditorSelection} onClick={onClick}>
      {children}
    </button>
  );
}

// Panels are fixed-positioned from the trigger so scrolling toolbars cannot clip them.
function Popover({ label, trigger, active = false, disabled = false, wide = false, children }) {
  const [place, setPlace] = useState(null);
  const root = useRef(null);
  const open = !!place;
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setPlace(null);
    const outside = (event) => { if (!root.current?.contains(event.target)) close(); };
    const escape = (event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } };
    const scroll = (event) => { if (!root.current?.contains(event.target)) close(); };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape, true);
    window.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);
  const toggle = (event) => {
    if (open) { setPlace(null); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const half = wide ? 125 : 100;
    const left = Math.max(half + 8, Math.min(window.innerWidth - half - 8, rect.left + rect.width / 2));
    const below = rect.bottom + 6;
    // Open upwards when there is no room below (e.g. a bubble near the bottom edge).
    setPlace(below > window.innerHeight - 260 ? { left, bottom: window.innerHeight - rect.top + 6 } : { left, top: below });
  };
  return (
    <div ref={root} className="uf-fmt-pop">
      <button type="button" className="uf-fmt-btn uf-fmt-btn--menu" aria-label={label} title={label} aria-haspopup="true" aria-expanded={open}
        aria-pressed={active} disabled={disabled} onMouseDown={keepEditorSelection} onClick={toggle}>
        {trigger}<ChevronDown size={12} aria-hidden="true" />
      </button>
      {open ? <div className={`uf-fmt-pop__panel${wide ? " is-wide" : ""}`} style={place} role="group" aria-label={label}>{children(() => setPlace(null))}</div> : null}
    </div>
  );
}

// Size dropdown in px (기본, 14 … 40). A size not on the list (older drafts) is shown as its own option.
export function TextSizeSelect({ editor, fontSize, disabled }) {
  const current = fontSize || "";
  const custom = current && !TEXT_SIZE_OPTIONS.includes(current);
  return (
    <select className="uf-fmt-size-select" aria-label="글자 크기" title="글자 크기" value={current} disabled={disabled}
      onChange={(event) => setTextSize(editor, event.target.value || null)}>
      {TEXT_SIZE_OPTIONS.map((value) => <option key={value || "default"} value={value || ""}>{textSizeLabel(value)}</option>)}
      {custom ? <option value={current}>{textSizeLabel(current)}</option> : null}
    </select>
  );
}

function Swatches({ colors, current, onPick }) {
  return (
    <div className="uf-fmt-swatches">
      {colors.map((color) => (
        <button key={color.label} type="button" className="uf-fmt-swatch" aria-label={color.label} title={color.label} aria-pressed={(current || null) === color.value}
          style={{ "--swatch": color.value || "var(--uf-text)" }} data-default={color.value ? undefined : "true"}
          onMouseDown={keepEditorSelection} onClick={() => onPick(color.value)} />
      ))}
    </div>
  );
}

const isHex = (value) => /^#[0-9a-f]{6}$/i.test(String(value || ""));

export function TextColorPopover({ editor, color, disabled }) {
  const pick = (value) => { const chain = editor.chain().focus(); (value ? chain.setColor(value) : chain.unsetColor()).run(); };
  return (
    <Popover label="글자 색" active={!!color} disabled={disabled}
      trigger={<span className="uf-fmt-color" style={{ "--swatch": color || "var(--uf-text)" }} aria-hidden="true">A</span>}>
      {(close) => (
        <>
          <Swatches colors={TEXT_COLORS} current={color} onPick={(value) => { pick(value); close(); }} />
          <label className="uf-fmt-custom">직접 고르기
            <input type="color" value={isHex(color) ? color : "#111111"} onChange={(event) => pick(event.target.value)} />
          </label>
        </>
      )}
    </Popover>
  );
}

export function HighlightPopover({ editor, highlight, disabled }) {
  return (
    <Popover label="형광펜" active={!!highlight} disabled={disabled}
      trigger={<span className="uf-fmt-highlight" style={{ "--swatch": highlight || "var(--uf-mark-yellow)" }}><Highlighter size={14} aria-hidden="true" /></span>}>
      {(close) => (
        <>
          <Swatches colors={HIGHLIGHT_COLORS} current={highlight} onPick={(value) => { editor.chain().focus().setHighlight({ color: value }).run(); close(); }} />
          <label className="uf-fmt-custom">직접 고르기
            <input type="color" value={isHex(highlight) ? highlight : "#fff59d"} onChange={(event) => editor.chain().focus().setHighlight({ color: event.target.value }).run()} />
          </label>
          <button type="button" className="uf-fmt-pop__item" disabled={!highlight} onMouseDown={keepEditorSelection}
            onClick={() => { editor.chain().focus().unsetHighlight().run(); close(); }}>형광펜 지우기</button>
        </>
      )}
    </Popover>
  );
}

export function TextPresetPopover({ editor, disabled }) {
  return (
    <Popover label="글자 스타일" disabled={disabled} wide trigger={<><Sparkles size={14} aria-hidden="true" /><span className="uf-fmt-label">스타일</span></>}>
      {(close) => TEXT_STYLE_PRESETS.map((preset) => (
        <button key={preset.id} type="button" className="uf-fmt-pop__item uf-fmt-preset" onMouseDown={keepEditorSelection}
          onClick={() => { applyTextPreset(editor, preset); close(); }}>
          <span className={`uf-fmt-preset__sample is-${preset.id}`}>{preset.label}</span><small>{preset.hint}</small>
        </button>
      ))}
    </Popover>
  );
}
