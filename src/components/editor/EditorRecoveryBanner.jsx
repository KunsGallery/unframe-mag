import { RotateCcw, Trash2 } from "lucide-react";

export default function EditorRecoveryBanner({ draftsApi, editorReady, isDirty, confirmEditor, setters }) {
  return (
    <>
      {draftsApi.recovery && <section aria-label="초안 복구" className="uf-recovery">
        <div role="status"><strong>이 기기에 저장하지 않은 초안이 있어요.</strong><p>{draftsApi.recovery.snapshot.title || "제목 없는 초안"}</p></div>
        <button type="button" disabled={!editorReady || draftsApi.isDraftLoading || draftsApi.isSaving} onClick={async () => {
          if (isDirty && !await confirmEditor("현재 변경사항을 복구할 초안으로 바꿀까요?")) return;
          draftsApi.restoreRecovery(setters);
        }}><RotateCcw size={16} />복구</button>
        <button type="button" disabled={draftsApi.isSaving} onClick={async () => { if (await confirmEditor("이 기기의 복구 초안을 삭제할까요?")) draftsApi.discardRecovery(); }}><Trash2 size={16} />삭제</button>
      </section>}
      {draftsApi.recoveryError && <p role="alert" className="uf-recovery">기기 저장 공간에 초안을 보관하지 못했어요. 페이지를 닫기 전에 저장해 주세요.</p>}
      {draftsApi.recoveryNeedsSave && <p role="status" className="uf-recovery">초안을 복구했어요. 저장 버튼을 누르면 서버에 반영됩니다.</p>}
    </>
  );
}
