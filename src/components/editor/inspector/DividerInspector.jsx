// src/components/editor/inspector/DividerInspector.jsx
import Row from "./InspectorRow";

export default function DividerInspector({ selected, setAttrs, isDarkMode }) {
  return (
    <div className="space-y-5">
      <Row label="Style">
        <select
          value={selected.attrs.styleType ?? "line"}
          onChange={(e) =>
            setAttrs("ufDivider", { styleType: e.target.value })
          }
          className={[
            "w-full px-3 py-2 rounded-xl border text-sm bg-transparent",
            isDarkMode
              ? "border-zinc-900 text-white"
              : "border-zinc-200 text-black",
          ].join(" ")}
        >
          <option value="line">line</option>
          <option value="dashed">dashed</option>
          <option value="double">double</option>
          <option value="dots">dots</option>
          <option value="fade">fade</option>
          <option value="glow">glow</option>
          <option value="space">space</option>
        </select>
      </Row>
    </div>
  );
}
