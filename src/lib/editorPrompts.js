// src/lib/editorPrompts.js
import { requestEditorInput, withLinkScheme } from "./editorInput.js";
import { toEmbedURL } from "./ufEmbed.js";

const IMAGE_URL_HINT = "사진 파일은 본문에 끌어다 놓거나 붙여넣으면 바로 올라가요.";
export const askImageUrl = (title) => requestEditorInput({
  title, label: "이미지 주소", placeholder: "https://", inputMode: "url", hint: IMAGE_URL_HINT, confirmLabel: "넣기",
  validate: (value) => (/^https?:\/\//i.test(withLinkScheme(value)) ? "" : "http(s)로 시작하는 이미지 주소를 입력해 주세요."),
}).then((value) => (value ? withLinkScheme(value) : value));

const EMBED_TEXT = {
  playlist: { title: "플레이리스트 넣기", placeholder: "https://open.spotify.com/playlist/… 또는 https://www.youtube.com/playlist?list=…", hint: "Spotify 또는 YouTube 재생목록 링크를 붙여넣으세요." },
  podcast: { title: "팟캐스트 넣기", placeholder: "https://open.spotify.com/show/… 또는 /episode/…", hint: "Spotify 쇼·에피소드 또는 YouTube 링크를 붙여넣으세요." },
};
// Shared by the slash menu and the toolbar so both insert paths validate links the same way.
export const askEmbedUrl = (kind, defaultValue = "") => requestEditorInput({
  ...EMBED_TEXT[kind], label: "링크", defaultValue, inputMode: "url", confirmLabel: "넣기",
  validate: (value) => (toEmbedURL(kind, value, { theme: "0" })?.ok ? "" : "지원하지 않는 링크예요. Spotify 또는 YouTube 링크를 확인해 주세요."),
});
