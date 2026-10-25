// src/components/editor/inspector/CalloutInspector.jsx
import Row from "./InspectorRow";

const CALLOUT_LABEL_BY_TONE = {
  note: "NOTE",
  point: "POINT",
  info: "INFO",
  quote: "QUOTE",
};

export default function CalloutInspector({ selected, setAttrs, isDarkMode }) {
  return (
    <div className="space-y-5">
      <Row label="Tone">
        <select
          value={selected.attrs.tone ?? "note"}
          onChange={(e) => {
            const tone = e.target.value;
            setAttrs("ufCallout", {
              tone,
              label: CALLOUT_LABEL_BY_TONE[tone] || "NOTE",
            });
          }}
          className={[
            "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
            isDarkMode
              ? "border-zinc-900 text-white"
              : "border-zinc-200 text-black",
          ].join(" ")}
        >
          <option value="note">note</option>
          <option value="point">point</option>
          <option value="info">info</option>
          <option value="quote">quote</option>
        </select>
      </Row>

      <Row label="Label">
        <input
          value={selected.attrs.label ?? "NOTE"}
          onChange={(e) =>
            setAttrs("ufCallout", { label: e.target.value })
          }
          className={[
            "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
            isDarkMode
              ? "border-zinc-900 text-white"
              : "border-zinc-200 text-black",
          ].join(" ")}
          placeholder="NOTE"
        />
      </Row>
    </div>
  );
}
