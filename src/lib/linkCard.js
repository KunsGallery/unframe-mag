// Link cards: ask for a URL, read its preview through /api/link-preview, insert a ufLinkCard.
import { requestEditorInput, withLinkScheme } from "./editorInput.js";
import { isPublicationLinkValid } from "./publicationChecks.js";

const hostOf = (value) => { try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return ""; } };

export async function fetchLinkPreview(url, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl("/api/link-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "link-preview-failed"), { code: data.error });
  return data;
}

// Card attributes from a preview response; falls back to the bare address.
export function linkCardAttrs(url, preview = {}) {
  const host = hostOf(preview.url || url);
  return {
    url: preview.url || url,
    title: String(preview.title || host || url).slice(0, 160),
    description: String(preview.description || "").slice(0, 300),
    image: String(preview.image || ""),
    siteName: String(preview.siteName || host).slice(0, 80),
  };
}

export async function insertLinkCard(editor, { onToast } = {}) {
  const value = await requestEditorInput({
    title: "링크 카드 넣기", label: "주소", placeholder: "https://", inputMode: "url", confirmLabel: "넣기",
    hint: "페이지의 제목·설명·대표 이미지로 카드를 만들어요. 블록 설정에서 고칠 수 있어요.",
    validate: (text) => (isPublicationLinkValid(withLinkScheme(text)) ? "" : "열 수 없는 주소예요. https://로 시작하는지 확인해 주세요."),
  });
  if (!value || editor.isDestroyed) return false;
  const url = withLinkScheme(value);
  const at = editor.state.selection.from;
  onToast?.("링크 정보를 불러오는 중…");
  let attrs;
  try {
    attrs = linkCardAttrs(url, await fetchLinkPreview(url));
  } catch {
    attrs = linkCardAttrs(url);
    onToast?.("미리보기 정보를 가져오지 못했어요. 블록 설정에서 제목과 이미지를 넣어 주세요.");
  }
  if (editor.isDestroyed) return false;
  const pos = Math.min(at, editor.state.doc.content.size);
  return editor.chain().focus().insertContentAt(pos, { type: "ufLinkCard", attrs }).run();
}
