import { useEffect, useState } from "react";

// TipTap 에디터가 초기화를 마쳤는지 추적합니다.
export function useEditorReady(editor) {
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    if (!editor) {
      // EditorPage에서 옮겨온 기존 동작 그대로: 에디터가 사라지면 즉시 초기화
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditorReady(false);
      return undefined;
    }

    let rafId = 0;

    const syncReady = () => {
      if (!editor || editor.isDestroyed) {
        setEditorReady(false);
        return;
      }

      if (editor.isInitialized) {
        setEditorReady(true);
        return;
      }

      rafId = window.requestAnimationFrame(syncReady);
    };

    syncReady();

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [editor]);

  return editorReady;
}
