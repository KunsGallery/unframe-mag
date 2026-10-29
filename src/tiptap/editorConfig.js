// src/tiptap/editorConfig.js
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { ResponsiveImage as Image } from "./nodes/ResponsiveImage";
import Link from "@tiptap/extension-link";
import Strike from "@tiptap/extension-strike";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";

import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

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
import { UfTable } from "../tiptap/nodes/UfTable";
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
import { SearchReplace } from "./extensions/SearchReplace";
import { ImageUploads, imageFiles, uploadImagesAt } from "./extensions/ImageUploads";
import { UfFootnote } from "./nodes/UfFootnote";
import { Superscript, Subscript, DropCap, TextSizeShortcuts } from "./extensions/TextExtras";
import { BlockTools } from "./extensions/BlockTools";
import { Extension } from "@tiptap/core";
import { editLink } from "../lib/editorPrompts";

// ⌘K opens the shared link dialog (toolbar and selection bubble use the same one).
const LinkShortcut = Extension.create({
  name: "linkShortcut",
  addKeyboardShortcuts() {
    return { "Mod-k": () => { editLink(this.editor); return true; } };
  },
});

export function createEditorConfig({ onUploadImage, onToast }) {
  return {
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
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
      Superscript,
      Subscript,
      DropCap,
      TextSizeShortcuts,
      BlockTools,
      LinkShortcut,

      TextAlign.configure({ types: ["heading", "paragraph"] }),

      TaskList,
      TaskItem.configure({ nested: true }),

      UfTable.configure({
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
      UfFootnote,
      EditorKeyBehavior,
      PasteSanitizer,
      SearchReplace,
      ImageUploads,
    ],

    editorProps: {
      attributes: {
        class: "ProseMirror uf-editor uf-prose max-w-none focus:outline-none min-h-[500px]",
      },

      handlePaste: (view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (!files.length || !onUploadImage) return false;
        event.preventDefault();
        uploadImagesAt(view, files, view.state.selection.to, { upload: onUploadImage, onToast });
        return true;
      },

      // Dropped photos land where they were dropped, not at the old cursor.
      handleDrop: (view, event) => {
        const files = imageFiles(event.dataTransfer?.files);
        if (!files.length || !onUploadImage) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? view.state.selection.to;
        uploadImagesAt(view, files, pos, { upload: onUploadImage, onToast });
        return true;
      },
    },
  };
}
