import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const MAX_IMAGES_PER_DROP = 12;
const uploadsKey = new PluginKey("ufImageUploads");

function placeholderElement(label) {
  const element = document.createElement("span");
  element.className = "uf-upload-placeholder";
  element.setAttribute("role", "status");
  element.textContent = label;
  return element;
}

// Placeholders are widgets, not document content, so they never reach a save.
export const ImageUploads = Extension.create({
  name: "imageUploads",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: uploadsKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            let next = set.map(tr.mapping, tr.doc);
            const meta = tr.getMeta(uploadsKey);
            if (meta?.add) {
              const { id, pos, element } = meta.add;
              next = next.add(tr.doc, [Decoration.widget(pos, element, { id, side: -1 })]);
            }
            if (meta?.remove) next = next.remove(next.find(null, null, (spec) => spec.id === meta.remove));
            return next;
          },
        },
        props: { decorations: (state) => uploadsKey.getState(state) },
      }),
    ];
  },
});

function placeholderPos(state, id) {
  const found = uploadsKey.getState(state)?.find(null, null, (spec) => spec.id === id);
  return found?.length ? found[0].from : null;
}

export function imageFiles(list) {
  return Array.from(list || []).filter((file) => String(file?.type || "").startsWith("image/"));
}

// Uploads every image, then inserts one image or a gallery where the placeholder now sits.
export async function uploadImagesAt(view, files, pos, { upload, onToast }) {
  const images = files.slice(0, MAX_IMAGES_PER_DROP);
  if (!images.length) return;
  if (files.length > images.length) onToast?.(`한 번에 ${MAX_IMAGES_PER_DROP}장까지 올릴 수 있어요. 앞의 ${images.length}장만 올릴게요.`);
  const id = {};
  const base = images.length > 1 ? `이미지 ${images.length}장 업로드 중` : "이미지 업로드 중";
  // The widget keeps this element, so progress updates edit it in place.
  const element = placeholderElement(`${base}…`);
  view.dispatch(view.state.tr.setMeta(uploadsKey, { add: { id, pos, element } }));

  const progress = images.map(() => 0);
  const results = await Promise.allSettled(images.map((file, index) => upload(file, {
    onProgress: (value) => {
      progress[index] = value;
      element.textContent = `${base}… ${Math.round(progress.reduce((sum, item) => sum + item, 0) / images.length)}%`;
    },
  })));
  if (view.isDestroyed) return;

  const urls = results.filter((result) => result.status === "fulfilled" && result.value).map((result) => result.value);
  const failed = results.filter((result) => result.status === "rejected");
  const at = placeholderPos(view.state, id) ?? view.state.selection.to;
  const tr = view.state.tr.setMeta(uploadsKey, { remove: id });
  const { schema } = view.state;
  const node = urls.length === 1
    ? schema.nodes.image.create({ src: urls[0] })
    : urls.length > 1 && schema.nodes.gallery
      ? schema.nodes.gallery.create({ images: urls.map((src) => ({ src, alt: "", caption: "" })) })
      : null;
  if (node) tr.replaceRangeWith(at, at, node);
  view.dispatch(tr);
  if (failed.length) {
    const reason = failed[0].reason?.userMessage || "이미지를 올리지 못했어요.";
    onToast?.(urls.length ? `${failed.length}장은 올리지 못했어요. ${reason}` : reason);
  } else if (urls.length > 1) {
    onToast?.(`이미지 ${urls.length}장을 갤러리로 넣었어요. 대체 텍스트를 입력해 주세요.`);
  }
}
