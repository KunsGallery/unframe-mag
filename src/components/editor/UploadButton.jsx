// src/components/UploadButton.jsx
import React, { useRef } from "react";
import { Image as ImageIcon } from "lucide-react";

export default function UploadButton({
  label = "Upload",
  title,
  disabled,
  uploading,
  progress,
  accept = "image/*",
  onPickFile, // (file) => void
  icon: Icon = ImageIcon,
}) {
  const fileRef = useRef(null);

  return (
    <>
      <button
        type="button"
        title={title}
        disabled={disabled || uploading}
        onClick={() => fileRef.current?.click()}
        className={[
          "inline-flex items-center gap-2 px-2.5 py-2 rounded-lg transition select-none",
          "text-zinc-500 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800",
          (disabled || uploading) ? "opacity-40 cursor-not-allowed" : "",
        ].join(" ")}
      >
        <Icon size={18} />
        <span className="hidden sm:inline text-xs font-black">{label}</span>

        {uploading && (
          <span className="ml-1 text-[11px] font-black text-[#004aad]">
            {Math.min(100, Math.max(0, progress || 0))}%
          </span>
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickFile?.(f);
          e.target.value = "";
        }}
      />
    </>
  );
}