// src/tiptap/SoundCloud.js
/**
 * ✅ SoundCloud Embed Extension (TipTap v3)
 *
 * HTML 구조(반응형):
 * <div class="uf-embed uf-embed--soundcloud">
 *   <iframe src="..." ...></iframe>
 * </div>
 *
 * - src는 SoundCloud embed URL 권장
 * - 일반 공유 URL도 넣으면 embed로 변환 시도(간단 처리)
 */

import { Node, mergeAttributes } from "@tiptap/core";

function normalizeSoundCloudUrl(input) {
  const url = (input || "").trim();
  if (!url) return "";

  // 이미 embed iframe URL이면 그대로
  if (url.includes("w.soundcloud.com/player")) return url;

  // 공유 링크를 embed 형태로 감싸기 (SoundCloud 기본 embed 방식)
  // https://soundcloud.com/... -> https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/...
  if (url.includes("soundcloud.com")) {
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}`;
  }

  return url; // 혹시 사용자가 embed URL을 다른 형태로 넣는 경우
}

export const SoundCloud = Node.create({
  name: "soundcloud",

  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (el) => el.querySelector("iframe")?.getAttribute("src") || "",
        renderHTML: (attrs) => ({ "data-src": attrs.src || "" }),
      },
      height: {
        default: 166,
        parseHTML: (el) => Number(el.getAttribute("data-height") || 166),
        renderHTML: (attrs) => ({ "data-height": String(attrs.height || 166) }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div.uf-embed--soundcloud' },
      { tag: 'iframe[src*="w.soundcloud.com/player"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const src = normalizeSoundCloudUrl(HTMLAttributes["data-src"] || "");
    const height = Number(HTMLAttributes["data-height"] || 166) || 166;

    return [
      "div",
      mergeAttributes({ class: "uf-embed uf-embed--soundcloud" }, HTMLAttributes),
      [
        "iframe",
        {
          src,
          height: String(height),
          width: "100%",
          frameborder: "0",
          allow: "autoplay",
          loading: "lazy",
        },
      ],
    ];
  },

  addCommands() {
    return {
      setSoundCloud:
        (options) =>
        ({ chain }) => {
          const src = normalizeSoundCloudUrl(options?.src || "");
          if (!src) return false;

          return chain()
            .focus()
            .insertContent({
              type: this.name,
              attrs: {
                src,
                height: options?.height ?? 166,
              },
            })
            .run();
        },
    };
  },
});
