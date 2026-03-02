import React from "react";

export default function TierBadge({ tierLabel, tierColor, level }) {
  const color = tierColor || "#9CA3AF";
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-[0.25em]"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
      title="Tier"
    >
      {tierLabel || "Rookie"} <span className="opacity-70">LV {level || 1}</span>
    </span>
  );
}