// src/tiptap/editorConfig.js
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Strike from "@tiptap/extension-strike";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";

import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";

import { FontSize } from "./extensions/FontSize";
import { LineHeight } from "./extensions/LineHeight";
import { LetterSpacing } from "./extensions/LetterSpacing";

import { Scene } from "../tiptap/nodes/Scene";
import { UfImage } from "../tiptap/nodes/UfImage";
import { ParallaxImage } from "../tiptap/nodes/ParallaxImage";
import { StickyStory } from "../tiptap/nodes/StickyStory";
import { Gallery } from "../tiptap/nodes/Gallery";
import { SlideGallery } from "./nodes/SlideGallery";
import { UfPoll } from "../tiptap/nodes/UfPoll";
import { UfPlaylist } from "../tiptap/nodes/UfPlaylist";
import { UfPodcast } from "../tiptap/nodes/UfPodcast";
import { UfDivider } from "../tiptap/nodes/UfDivider";
import { UfCallout } from "../tiptap/nodes/UfCallout";
import { Columns, Column } from "./nodes/Columns";
import { EditorKeyBehavior } from "./extensions/EditorKeyBehavior";
import { PasteSanitizer } from "./extensions/PasteSanitizer";

export function createEditorConfig({ onUploadImage, onToast }) {
  return {
    extensions: [
      StarterKit.configure({
        link: false,
        strike: false,
      }),

      Link.configure({ openOnClick: false }),
      Strike,

      TextStyle,
      Color,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      FontSize,
      LetterSpacing,
      LineHeight,
      Highlight.configure({
        multicolor: true,
      }),

      TextAlign.configure({ types: ["heading", "paragraph"] }),

      TaskList,
      TaskItem.configure({ nested: true }),

      Table.configure({
        resizable: true,
        handleWidth: 6,
        cellMinWidth: 120,
        lastColumnResizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,

      Image,

      Placeholder.configure({
        placeholder: "당신의 이야기를 언프레임 하세요... (/ 를 눌러 명령어 메뉴)",
      }),

      Scene,
      Columns,
      Column,
      UfImage,
      ParallaxImage,
      StickyStory,
      Gallery,
      SlideGallery,
      UfPoll,
      UfPlaylist,
      UfPodcast,
      UfDivider,
      UfCallout,
      EditorKeyBehavior,
      PasteSanitizer,
    ],

    editorProps: {
      attributes: {
        class: "ProseMirror uf-editor uf-prose max-w-none focus:outline-none min-h-[500px]",
      },

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