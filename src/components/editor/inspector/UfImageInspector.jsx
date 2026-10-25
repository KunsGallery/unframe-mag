// src/components/editor/inspector/UfImageInspector.jsx
import Row from "./InspectorRow";

export default function UfImageInspector({ selected, setAttrs, isDarkMode, ufImageCaptionValue, setUfImageCaptionDraftValue, isUfImageComposing, setIsUfImageComposing }) {
  return (
    <div className="space-y-5">
      <Row label="Size">
        <select
          value={selected.attrs.size ?? "normal"}
          onChange={(e) => setAttrs("ufImage", { size: e.target.value })}
          className={[
            "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
            isDarkMode
              ? "border-zinc-900 text-white"
              : "border-zinc-200 text-black",
          ].join(" ")}
        >
          <option value="xsmall">xsmall</option>
          <option value="small">small</option>
          <option value="normal">normal</option>
          <option value="wide">wide</option>
          <option value="full">full</option>
        </select>
      </Row>

      <Row label="Align">
        <select
          value={selected.attrs.align ?? "center"}
          onChange={(e) => setAttrs("ufImage", { align: e.target.value })}
          className={[
            "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
            isDarkMode
              ? "border-zinc-900 text-white"
              : "border-zinc-200 text-black",
          ].join(" ")}
        >
          <option value="left">left</option>
          <option value="center">center</option>
          <option value="right">right</option>
        </select>
      </Row>

      <Row label="Caption">
        <input
          value={ufImageCaptionValue}
          onChange={(e) => {
            const next = e.target.value;
            setUfImageCaptionDraftValue(next);
            if (!isUfImageComposing) {
              setAttrs("ufImage", { caption: next });
            }
          }}
          onCompositionStart={() => setIsUfImageComposing(true)}
          onCompositionEnd={(e) => {
            const next = e.currentTarget.value;
            setIsUfImageComposing(false);
            setUfImageCaptionDraftValue(next);
            setAttrs("ufImage", { caption: next });
          }}
          onBlur={(e) => {
            const next = e.target.value;
            setUfImageCaptionDraftValue(next);
            setAttrs("ufImage", { caption: next });
          }}
          className={[
            "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
            isDarkMode
              ? "border-zinc-900 text-white"
              : "border-zinc-200 text-black",
          ].join(" ")}
          placeholder="캡션"
        />
      </Row>
    </div>
  );
}
