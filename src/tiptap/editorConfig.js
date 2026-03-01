// src/tiptap/editorConfig.js
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";

import Strike from "@tiptap/extension-strike";
import TextAlign from "@tiptap/extension-text-align";

import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

// ✅ Table 계열은 v3에서 named export
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

// 커스텀 노드
import { Scene } from "../tiptap/nodes/Scene";
import { UfImage } from "../tiptap/nodes/UfImage";
import { ParallaxImage } from "../tiptap/nodes/ParallaxImage";
import { StickyStory } from "../tiptap/nodes/StickyStory";

import { Gallery } from "../tiptap/nodes/Gallery";
import { UfPoll } from "../tiptap/nodes/UfPoll";

export function createEditorConfig({ onUploadImage, onToast }) {
  return {
    extensions: [
      // ✅ 중복 방지
      StarterKit.configure({
        link: false,
        strike: false,
      }),

      Link.configure({ openOnClick: false }),

      // ✅ formatting
      Strike,
      TextAlign.configure({ types: ["heading", "paragraph"] }),

      // ✅ task
      TaskList,
      TaskItem.configure({ nested: true }),

      // ✅ real table (editable)
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,

      // ✅ image
      Image,

      Placeholder.configure({
        placeholder: "당신의 이야기를 언프레임 하세요... (/ 를 눌러 명령어 메뉴)",
      }),

      // ✅ U# 커스텀 노드
      Scene,
      UfImage,
      ParallaxImage,
      StickyStory,

      // ✅ extra blocks
      Gallery,
      UfPoll,
    ],

    editorProps: {
      attributes: {
        class:
          "ProseMirror uf-editor prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[500px] italic font-light leading-relaxed",
      },

      // ✅ 이미지 붙여넣기 업로드
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files || []);
        const image = files.find((f) => f.type.startsWith("image/"));
        if (!image) return false;

        event.preventDefault();
        (async () => {
          try {
            const url = await onUploadImage(image);
            window.dispatchEvent(new CustomEvent("uf:insert-image", { detail: { url } }));
          } catch (e) {
            console.error(e);
            onToast?.("이미지 업로드 실패");
          }
        })();

        return true;
      },

      // ✅ 이미지 드롭 업로드
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files || []);
        const image = files.find((f) => f.type.startsWith("image/"));
        if (!image) return false;

        event.preventDefault();
        (async () => {
          try {
            const url = await onUploadImage(image);
            window.dispatchEvent(new CustomEvent("uf:insert-image", { detail: { url } }));
          } catch (e) {
            console.error(e);
            onToast?.("이미지 업로드 실패");
          }
        })();

        return true;
      },
    },
  };
}