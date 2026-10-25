import { useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";
import { Save } from "lucide-react";

export default function EditorLeaveGuard({ draftsApi, meta }) {
  const blocker = useBlocker(() => draftsApi.hasUnsavedChanges());
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (blocker.state === "blocked") dialog?.showModal();
    else if (dialog?.open) dialog.close();
  }, [blocker.state]);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="editor-leave-title"
      onCancel={(event) => { event.preventDefault(); blocker.reset?.(); }}
      className="m-auto w-[calc(100%_-_32px)] max-w-md rounded-lg bg-[var(--uf-bg)] p-6 text-[var(--uf-text)] backdrop:bg-black/50"
    >
      <h2 id="editor-leave-title" className="text-lg font-bold">저장하지 않은 변경사항이 있어요</h2>
      <p className="mt-3 text-sm">페이지를 떠나기 전에 변경사항을 저장할까요?</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" autoFocus onClick={() => blocker.reset?.()} className="min-h-11 rounded px-3 py-2 border border-[var(--uf-muted)]">계속 편집</button>
        <button type="button" disabled={draftsApi.isSaving || !!draftsApi.recovery} onClick={async () => {
          const saved = await draftsApi.saveDraft({ markClean: true }, meta);
          if (saved && !draftsApi.hasUnsavedChanges()) blocker.proceed?.();
        }} className="inline-flex min-h-11 items-center gap-2 rounded px-3 py-2 bg-[#004aad] text-white disabled:opacity-50"><Save size={16} />저장 후 나가기</button>
        <button type="button" disabled={draftsApi.isSaving} onClick={() => { draftsApi.captureRecovery(meta); blocker.proceed?.(); }} className="min-h-11 rounded px-3 py-2 underline disabled:opacity-50">저장 없이 나가기</button>
      </div>
    </dialog>
  );
}
