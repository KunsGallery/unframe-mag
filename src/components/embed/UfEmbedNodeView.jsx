// src/components/embed/UfEmbedNodeView.jsx
import React, { useMemo, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { defaultEmbedHeight, toEmbedURL } from "../../lib/ufEmbed";

export default function UfEmbedNodeView(props) {
  const { node, updateAttributes, editor } = props;
  const editable = editor?.isEditable ?? false;

  const kind = node?.attrs?.kind || "playlist"; // playlist | podcast
  const url = node?.attrs?.url || "";
  const embedUrl = node?.attrs?.embedUrl || "";
  const height = Number(node?.attrs?.height || defaultEmbedHeight(kind));
  const theme = String(node?.attrs?.theme || "0");

  const [localUrl, setLocalUrl] = useState(url);
  const [err, setErr] = useState("");

  const title = useMemo(() => {
    return kind === "podcast" ? "Unframe Podcast" : "Unframe Playlist";
  }, [kind]);

  const apply = () => {
    setErr("");
    const nextUrl = String(localUrl || "").trim();
    if (!nextUrl) {
      updateAttributes({ url: "", embedUrl: "" });
      return;
    }
    const r = toEmbedURL(kind, nextUrl, { theme });
    if (!r.ok) {
      setErr("지원되지 않는 링크예요. (현재 Spotify 링크 권장)");
      updateAttributes({ url: nextUrl, embedUrl: "" });
      return;
    }
    updateAttributes({ url: nextUrl, embedUrl: r.embedUrl });
  };

  const setHeight = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    updateAttributes({ height: n });
  };

  const setTheme = (v) => {
    const t = String(v);
    updateAttributes({ theme: t });
    if (url) {
      const r = toEmbedURL(kind, url, { theme: t });
      updateAttributes({ embedUrl: r.ok ? r.embedUrl : "" });
    }
  };

  return (
    <NodeViewWrapper className="uf-embed my-8">
      <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
              / EMBED
            </div>
            <div className="mt-2 text-lg font-black italic tracking-tighter uppercase">
              {title}
            </div>
          </div>

          {editable && (
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteSelection().run()}
              className="text-[10px] font-black tracking-[0.35em] uppercase italic px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:opacity-80"
              title="Remove block"
            >
              REMOVE
            </button>
          )}
        </div>

        {editable && (
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-900 space-y-3">
            <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
              URL
            </div>

            <div className="flex gap-2">
              <input
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                onBlur={apply}
                placeholder={
                  kind === "podcast"
                    ? "Spotify podcast(show/episode) URL"
                    : "Spotify playlist URL"
                }
                className="flex-1 px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm font-black"
              />
              <button
                type="button"
                onClick={apply}
                className="px-5 py-3 rounded-2xl bg-[#004aad] text-white text-[10px] font-black tracking-[0.35em] uppercase italic"
              >
                APPLY
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
                HEIGHT
              </div>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-28 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm font-black"
              />

              <div className="ml-auto flex items-center gap-2">
                <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
                  THEME
                </div>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm font-black"
                >
                  <option value="0">Light</option>
                  <option value="1">Dark</option>
                </select>
              </div>
            </div>

            {err && <div className="text-sm font-black text-red-500">{err}</div>}
          </div>
        )}

        <div className="p-5">
          {embedUrl ? (
            <iframe
              title={title}
              src={embedUrl}
              width="100%"
              height={height}
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              style={{ borderRadius: 16, overflow: "hidden" }}
            />
          ) : (
            <div className="h-[180px] rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-xs font-black tracking-[0.35em] uppercase italic opacity-60">
              paste a {kind} url
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}