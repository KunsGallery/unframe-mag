// src/components/editor/InspectorPanel.jsx
import React, { useState } from "react";
import UploadButton from "./UploadButton";
import { useUploadImage } from "../../hooks/useUploadImage";
import { useSelectedUfBlock } from "../../hooks/useSelectedUfBlock";
import Row from "./inspector/InspectorRow";
import ParallaxInspector from "./inspector/ParallaxInspector";
import StickyStoryInspector from "./inspector/StickyStoryInspector";
import UfImageInspector from "./inspector/UfImageInspector";
import ColumnsInspector from "./inspector/ColumnsInspector";
import GalleryInspector from "./inspector/GalleryInspector";
import SlideGalleryInspector from "./inspector/SlideGalleryInspector";
import DividerInspector from "./inspector/DividerInspector";
import CalloutInspector from "./inspector/CalloutInspector";
import LinkCardInspector from "./inspector/LinkCardInspector";

export default function InspectorPanel({ editor, isDarkMode, onToast, embedded = false }) {
  const selected = useSelectedUfBlock(editor);
  const { upload, uploading, progress } = useUploadImage();
  const toast = (message) => (onToast ? onToast(message) : console.log(message));

  const selectedUfImageCaption =
    selected?.type === "ufImage" ? selected.attrs.caption ?? "" : "";
  const [ufImageCaptionDraft, setUfImageCaptionDraft] = useState({
    sourceCaption: "",
    value: "",
  });
  const [isUfImageComposing, setIsUfImageComposing] = useState(false);
  const [dragState, setDragState] = useState({
    type: null,
    fromIndex: -1,
    overIndex: -1,
  });

  const ufImageCaptionValue =
    ufImageCaptionDraft.sourceCaption === selectedUfImageCaption
      ? ufImageCaptionDraft.value
      : selectedUfImageCaption;

  if (!editor) return null;

  const setAttrs = (type, patch) => {
    if (!editor.isEditable || selected?.type !== type) return;
    const node = editor.state.doc.nodeAt(selected.pos);
    if (node !== selected.node) return;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(selected.pos, undefined, { ...node.attrs, ...patch }));
  };

  const replaceImageFile = async (file, index = null) => {
    const target = selected;
    if (!target || uploading || !editor.isEditable) return;
    try {
      const { url } = await upload(file);
      const node = editor.state.doc.nodeAt(target.pos);
      if (node !== target.node) { toast("블록이 바뀌었어요. 이미지를 다시 선택해 주세요."); return; }
      const patch = index === null
        ? { [target.type === 'stickyStory' ? 'imageSrc' : target.type === 'ufLinkCard' ? 'image' : 'src']: url }
        : { images: node.attrs.images.map((image, imageIndex) => imageIndex === index ? { ...image, src: url } : image) };
      editor.view.dispatch(editor.state.tr.setNodeMarkup(target.pos, undefined, { ...node.attrs, ...patch }));
      toast("이미지를 교체했어요. 확인한 뒤 저장해 주세요.");
    } catch (error) { toast(error?.userMessage || "이미지를 교체하지 못했어요. 다시 시도해 주세요."); }
  };

  const removeImageAt = (type, images, index) => {
    if (!Array.isArray(images) || images.length <= 1) {
      toast("마지막 이미지는 삭제할 수 없어요.");
      return;
    }

    const next = images.filter((_, i) => i !== index);
    setAttrs(type, { images: next });
  };

  const reorderImages = (images, fromIndex, toIndex) => {
    if (!Array.isArray(images)) return images;
    if (fromIndex === toIndex) return images;
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= images.length ||
      toIndex >= images.length
    ) {
      return images;
    }

    const next = [...images];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const startImageDrag = (type, index, e) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${type}:${index}`);
    setDragState({
      type,
      fromIndex: index,
      overIndex: index,
    });
  };

  const handleImageDragOver = (type, index, e) => {
    if (dragState.type !== type) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragState.overIndex !== index) {
      setDragState((prev) => ({ ...prev, overIndex: index }));
    }
  };

  const handleImageDrop = (type, images, index, e) => {
    if (dragState.type !== type) return;
    e.preventDefault();

    const next = reorderImages(images, dragState.fromIndex, index);
    if (next !== images) {
      setAttrs(type, { images: next });
    }

    setDragState({
      type: null,
      fromIndex: -1,
      overIndex: -1,
    });
  };

  const clearImageDrag = () => {
    setDragState({
      type: null,
      fromIndex: -1,
      overIndex: -1,
    });
  };

  const setUfImageCaptionDraftValue = (value) => {
    setUfImageCaptionDraft({
      sourceCaption: selectedUfImageCaption,
      value,
    });
  };

  const imageListProps = {
    selected,
    setAttrs,
    isDarkMode,
    dragState,
    startImageDrag,
    handleImageDragOver,
    handleImageDrop,
    clearImageDrag,
    removeImageAt,
    replaceImageFile,
    uploading,
    progress,
  };

  return (
    <aside
      className={[
        embedded ? "uf-inspector-embedded" : "hidden xl:block fixed right-0 top-[80px] bottom-0 z-40 w-[320px]",
        "overflow-y-auto overscroll-contain",
        "border-l",
        isDarkMode ? "border-zinc-900 bg-zinc-950" : "border-zinc-100 bg-white",
      ].join(" ")}
    >
      <div className="p-6 space-y-6">
        <div>
          <div className="text-[10px] font-black tracking-widest uppercase text-zinc-400">
            블록 설정
          </div>
          <div className="mt-2 text-sm font-black">
            {selected ? ({ ufImage: '이미지', image: '이미지', gallery: '사진 갤러리', slideGallery: '슬라이드 갤러리', columns: '다단 구성', parallaxImage: '패럴랙스 이미지', stickyStory: '스크롤 스토리', ufDivider: '구분선', ufCallout: '인용 / 안내', ufLinkCard: '링크 카드', table: '표' }[selected.type] || selected.type) : "선택된 블록 없음"}
          </div>
          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            블록을 클릭하면 설정이 여기 나타나요.
          </div>
        </div>

        {!selected && (
          <div
            className={[
              "rounded-2xl p-4 border text-xs leading-relaxed",
              isDarkMode
                ? "border-zinc-900 text-zinc-400"
                : "border-zinc-100 text-zinc-500",
            ].join(" ")}
          >
            예: Parallax / Sticky / Image / Gallery 블록을 클릭해보세요.
          </div>
        )}

        {['image', 'ufImage', 'parallaxImage', 'stickyStory'].includes(selected?.type) && <Row label="이미지 대체 텍스트">
          <input aria-label="이미지 대체 텍스트" value={selected.attrs.alt || ''} onChange={(event) => setAttrs(selected.type, { alt: event.target.value })} className="w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" />
        </Row>}
        {['image', 'ufImage', 'parallaxImage', 'stickyStory'].includes(selected?.type) && <UploadButton label="이미지 교체" title="현재 이미지 교체" uploading={uploading} progress={progress} onPickFile={(file) => replaceImageFile(file)} />}

        {/* -------- Parallax -------- */}
        {selected?.type === "parallaxImage" && (
          <ParallaxInspector selected={selected} setAttrs={setAttrs} isDarkMode={isDarkMode} />
        )}

        {/* -------- StickyStory -------- */}
        {selected?.type === "stickyStory" && (
          <StickyStoryInspector
            selected={selected}
            setAttrs={setAttrs}
            isDarkMode={isDarkMode}
            upload={upload}
            uploading={uploading}
            progress={progress}
            onToast={onToast}
          />
        )}

        {/* -------- UfImage -------- */}
        {selected?.type === "ufImage" && (
          <UfImageInspector
            selected={selected}
            setAttrs={setAttrs}
            isDarkMode={isDarkMode}
            ufImageCaptionValue={ufImageCaptionValue}
            setUfImageCaptionDraftValue={setUfImageCaptionDraftValue}
            isUfImageComposing={isUfImageComposing}
            setIsUfImageComposing={setIsUfImageComposing}
          />
        )}

        {/* -------- Columns -------- */}
        {selected?.type === "columns" && (
          <ColumnsInspector editor={editor} selected={selected} setAttrs={setAttrs} isDarkMode={isDarkMode} />
        )}

        {/* -------- Gallery -------- */}
        {selected?.type === "gallery" && (
          <GalleryInspector {...imageListProps} />
        )}

        {selected?.type === "slideGallery" && (
          <SlideGalleryInspector {...imageListProps} />
        )}

        {/* -------- Divider -------- */}
        {selected?.type === "ufDivider" && (
          <DividerInspector selected={selected} setAttrs={setAttrs} isDarkMode={isDarkMode} />
        )}

        {/* -------- Callout -------- */}
        {selected?.type === "ufCallout" && (
          <CalloutInspector selected={selected} setAttrs={setAttrs} isDarkMode={isDarkMode} />
        )}

        {/* -------- Link card -------- */}
        {selected?.type === "ufLinkCard" && (
          <LinkCardInspector selected={selected} setAttrs={setAttrs} isDarkMode={isDarkMode} onToast={toast}
            uploading={uploading} progress={progress} onPickImage={(file) => replaceImageFile(file)} />
        )}
      </div>
    </aside>
  );
}
