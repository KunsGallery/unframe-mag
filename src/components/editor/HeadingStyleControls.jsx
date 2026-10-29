import { useId } from "react";
import {
  HEADING_PARTS,
  LEADING_RANGE,
  TRACKING_RANGE,
  normalizeHeadingStyle,
  resetHeadingPart,
  resolveHeadingPart,
  updateHeadingPart,
} from "../../lib/headingStyle";

function Slider({ label, value, min, max, step, format, onChange, disabled }) {
  const id = useId();
  return (
    <div className="uf-heading-control">
      <label htmlFor={id}>{label}<output htmlFor={id}>{format(value)}</output></label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

// Title/subtitle typography for the article hero, edited live inside the preview.
// The size slider edits the viewport being previewed (desktop or mobile).
export default function HeadingStyleControls({ value, viewport, onChange }) {
  const style = normalizeHeadingStyle(value);
  const disabled = !onChange;
  const sizeKey = viewport === "mobile" ? "mobile" : "desktop";
  return (
    <div className="uf-heading-controls">
      {Object.entries(HEADING_PARTS).map(([key, spec]) => {
        const part = resolveHeadingPart(style, key);
        const set = (changes) => onChange(updateHeadingPart(style, key, changes));
        return (
          <fieldset key={key} disabled={disabled}>
            <legend>{spec.label}</legend>
            <Slider label={`크기 (${sizeKey === "mobile" ? "모바일" : "데스크톱"})`} value={part[sizeKey]} min={spec.size[0]} max={spec.size[1]} step={1}
              format={(v) => `${v}px`} onChange={(v) => set({ [sizeKey]: v })} />
            <Slider label="자간" value={part.tracking} min={TRACKING_RANGE[0]} max={TRACKING_RANGE[1]} step={0.005}
              format={(v) => `${v.toFixed(3)}em`} onChange={(v) => set({ tracking: v })} />
            <Slider label="줄 간격" value={part.leading} min={LEADING_RANGE[0]} max={LEADING_RANGE[1]} step={0.05}
              format={(v) => v.toFixed(2)} onChange={(v) => set({ leading: v })} />
            <button type="button" disabled={!style[key]} onClick={() => onChange(resetHeadingPart(style, key))}>기본값으로</button>
          </fieldset>
        );
      })}
      <p className="uf-heading-controls__hint">
        크기는 지금 보고 있는 화면(데스크톱·모바일)에 따로 저장돼요. 줄바꿈은 글쓰기 화면의 제목 칸에서 Enter, 부제 칸에서 Shift+Enter로 넣으세요.
        {disabled ? " 지금은 편집할 수 없는 상태예요." : ""}
      </p>
    </div>
  );
}
