import { Save, Send, CircleHelp, Eye, PanelRightClose, PanelRightOpen, Maximize2 } from "lucide-react";

export default function EditorWorkspaceActions({
  actionsRef,
  editor,
  draftsApi,
  loadingEditorMeta,
  editorDocMeta,
  saveStatusText,
  focusMode,
  setFocusMode,
  setShowOnboarding,
  isDesktopEditor,
  panelOpen,
  setPanelOpen,
  editorReady,
  setPreviewContent,
  editingDisabled,
  saveCurrent,
  coverUploading,
  setShowChecks,
}) {
  return (
    <header ref={actionsRef} className="uf-workspace-actions">
      <div className="uf-workspace-document">
        <strong>{loadingEditorMeta ? "불러오는 중" : editorDocMeta?.editMode === "revision" ? "발행 글 수정" : editorDocMeta?.status === "published" ? "발행된 글" : "새 글 / 초안"}</strong>
        <span role="status" aria-live="polite">{draftsApi.isSaving ? "저장 중..." : saveStatusText}</span>
      </div>
      <div className="uf-workspace-commands">
        <button type="button" title="집중 모드" aria-label="집중 모드" aria-pressed={focusMode} onClick={() => setFocusMode((value) => !value)}><Maximize2 size={18} /></button>
        <button type="button" title="편집 도움말" aria-label="편집 도움말" onClick={() => setShowOnboarding(true)}><CircleHelp size={18} /></button>
        <button type="button" title="편집 작업 패널" aria-label="편집 작업 패널" aria-expanded={isDesktopEditor ? !focusMode : panelOpen} onClick={() => { if (isDesktopEditor) setFocusMode((value) => !value); else setPanelOpen(true); }}>{focusMode ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}</button>
        <button type="button" disabled={!editorReady || draftsApi.isDraftLoading} onClick={() => setPreviewContent(editor.getJSON())}><Eye size={17} /><span>미리보기</span></button>
        <button type="button" disabled={editingDisabled} onClick={saveCurrent}><Save size={17} /><span>저장</span></button>
        <button type="button" className="uf-primary" disabled={editingDisabled || !editorReady || coverUploading} onClick={() => setShowChecks(true)}><Send size={17} /><span>발행</span></button>
      </div>
    </header>
  );
}
