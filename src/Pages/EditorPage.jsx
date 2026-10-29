// src/Pages/EditorPage.jsx
import React, { lazy, Suspense, useContext, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { UNSAFE_DataRouterContext, useLocation, useNavigate, useParams } from "react-router-dom";
import { ListTree, SlidersHorizontal, History, LayoutTemplate, FileText } from "lucide-react";

import { useEditor, EditorContent } from "@tiptap/react";
import { db } from "../firebase/config";

import SlashMenu from "../components/editor/SlashMenu";
import EditorToolbar from "../components/editor/EditorToolbar";
import InspectorPanel from "../components/editor/InspectorPanel";
import EditorOutline from "../components/editor/EditorOutline";
import EditorToolsPanel from "../components/editor/EditorToolsPanel";
import EditorLeaveGuard from "../components/editor/EditorLeaveGuard";
import EditorRecoveryBanner from "../components/editor/EditorRecoveryBanner";
import EditorWorkspaceActions from "../components/editor/EditorWorkspaceActions";
import EditorDocumentSettings from "../components/editor/EditorDocumentSettings";
import EditorDraftList from "../components/editor/EditorDraftList";
import EditorWorkspaceStyles from "../components/editor/EditorWorkspaceStyles";
import EditorConflictBanner from "../components/editor/EditorConflictBanner";
import EditorFindReplace from "../components/editor/EditorFindReplace";
import FootnoteEditor from "../components/editor/FootnoteEditor";
import EditorInputDialog from "../components/editor/EditorInputDialog";
import EditorShortcutsDialog from "../components/editor/EditorShortcutsDialog";
import { focusEditorBlock } from "../lib/editorOutline";
const EditorPreview = lazy(() => import("../components/editor/EditorPreview"));
const PublicationChecklist = lazy(() => import("../components/editor/PublicationChecklist"));
const EditorHistoryPanel = lazy(() => import("../components/editor/EditorHistoryPanel"));
const EditorTemplatesPanel = lazy(() => import("../components/editor/EditorTemplatesPanel"));
import BlockQuickBar from "../components/editor/BlockQuickBar";
import SelectionFormatBubble from "../components/editor/SelectionFormatBubble";
import BlockSideInserter from "../components/editor/BlockSideInserter";

import { useUploadImage } from "../hooks/useUploadImage";
import { uploadImageWithProgress } from "../lib/uploadWithProgress";

import { createEditorConfig } from "../tiptap/editorConfig";
import { useDrafts } from "../hooks/useDrafts";
import { useEditorConfirmation } from "../hooks/useEditorConfirmation";
import { useSlideGalleryRuntime } from "../hooks/useSlideGalleryRuntime";
import { useSlashMenu } from "../hooks/useSlashMenu";
import { useIsDesktopEditor } from "../hooks/useIsDesktopEditor";
import { useEditorReady } from "../hooks/useEditorReady";
import { useEditorDocMeta } from "../hooks/useEditorDocMeta";
import { useAutoResizeTextarea } from "../hooks/useAutoResizeTextarea";
import { useRecoveryCapture } from "../hooks/useRecoveryCapture";
import { useDraftConflictWatch } from "../hooks/useDraftConflictWatch";
import { useSelectedUfBlock } from "../hooks/useSelectedUfBlock";
import { useNow } from "../hooks/useNow";
import { formatClock, formatRelativeTime } from "../lib/relativeTime";
import EditorOnboardingModal from "../components/editor/EditorOnboardingModal";
import {
  shouldOpenEditorOnboarding,
  hideEditorOnboardingForever,
} from "../lib/editorOnboarding";
import { isAdminEmail } from "../constants/admin";
import { DEFAULT_ARTICLE_CATEGORY } from "../constants/categories";

export default function EditorPage({ isDarkMode, onToast, user, role = "user" }) {
  const { confirm: confirmEditor, confirmation } = useEditorConfirmation();
  const navigate = useNavigate();
  const location = useLocation();
  const dataRouter = useContext(UNSAFE_DataRouterContext);
  const { articleId } = useParams();
  const preloadedDraftId = location.state?.draftId || null;
  const loadedDraftRef = useRef(null);
  const toast = (msg) => (onToast ? onToast(msg) : console.log(msg));

  const isAdmin = useMemo(() => {
    if (!user?.email) return false;
    return role === "admin" || isAdminEmail(user.email);
  }, [user, role]);

  const isEditor = useMemo(() => !!user && role === "editor", [user, role]);
  const canWrite = isAdmin || isEditor;

  const authorName = useMemo(() => {
    return user?.displayName || "Unknown";
  }, [user?.displayName]);

  const authorEmail = useMemo(() => {
    return user?.email || "";
  }, [user?.email]);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [category, setCategory] = useState(DEFAULT_ARTICLE_CATEGORY);
  const [relatedEditionNos, setRelatedEditionNos] = useState([]);
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState([]);
  const [find, setFind] = useState({ open: false, query: "", token: 0 });
  const [cover, setCover] = useState("");
  const [coverMedium, setCoverMedium] = useState("");
  // Open on the document settings; jump to the block tab when a configurable block is selected.
  const [panelTab, setPanelTab] = useState("document");
  const [seenBlock, setSeenBlock] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [showChecks, setShowChecks] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const excerptRef = useRef(null);
  const workspaceRef = useRef(null);
  const actionsRef = useRef(null);
  useLayoutEffect(() => {
    const element = actionsRef.current;
    if (!element) return;
    const sync = () => workspaceRef.current?.style.setProperty('--uf-action-height', `${element.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    sync();
    return () => observer.disconnect();
  }, [canWrite]);


  const { upload: uploadCover, uploading: coverUploading, progress: coverProgress } =
    useUploadImage();
  const isDesktopEditor = useIsDesktopEditor();

  const { slashPos, closeSlashMenu, onEditorKeyDown } = useSlashMenu();

  const editorConfig = useMemo(
    () =>
      createEditorConfig({
        onUploadImage: (file, options) => uploadImageWithProgress(file, options),
        onToast,
      }),
    [onToast]
  );

  const editor = useEditor(editorConfig);
  const selectedBlock = useSelectedUfBlock(editor);
  const selectedBlockKey = selectedBlock ? `${selectedBlock.type}:${selectedBlock.pos}` : "";
  if (selectedBlockKey !== seenBlock) {
    setSeenBlock(selectedBlockKey);
    if (selectedBlockKey) setPanelTab("settings");
  }
  const galleryContainerRef = useRef(null);
  useSlideGalleryRuntime(galleryContainerRef, editor);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleStartNewDraft = async () => {
    if (draftsApi.isSaving || draftsApi.isDraftLoading) return;
    if (draftsApi.isDirty && !await confirmEditor("저장하지 않은 변경사항이 있어요. 변경사항을 버리고 새 초안을 시작할까요?")) return;
    loadedDraftRef.current = null;
    draftsApi.startNewDraft({
      setTitle,
      setSubtitle,
      setCategory,
      setCover,
      setCoverMedium,
      setRelatedEditionNos,
      setExcerpt,
      setTags,
    });
    setEditorDocMeta(null);
  };

  const draftsApi = useDrafts({
    db,
    editor,
    canWrite,
    isAdmin,
    authorName: user?.displayName || "",
    authorEmail: user?.email || "",
    userId: user?.email || "",
    historyUserId: user?.uid || "",
    documentId: preloadedDraftId || articleId || null,
    onToast,
    navigate,
  });
  const {
    draftId,
    isDirty,
    lastAutoSavedAt,
    loadDraft,
    runAutosave,
    captureRecovery,
    recovery: recoveryCandidate,
    setIsDirty: setDraftDirty,
  } = draftsApi;
  const currentMeta = { title, subtitle, excerpt, tags, category, cover, coverMedium, relatedEditionNos, author: authorName, authorEmail };
  const currentMetaRef = useRef(currentMeta);
  // 이벤트/타이머 핸들러가 항상 최신 메타를 읽도록 렌더 중에 갱신합니다(기존 동작 유지).
  // eslint-disable-next-line react-hooks/refs
  currentMetaRef.current = currentMeta;

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(canWrite && !recoveryCandidate);
  }, [editor, canWrite, recoveryCandidate]);

  useRecoveryCapture({ isDirty, captureRecovery, currentMetaRef });

  // "방금 저장됨" / "3분 전 저장됨"; the exact time stays in the tooltip.
  const now = useNow(15000);
  const saveStatusText = useMemo(() => {
    if (!lastAutoSavedAt) return isDirty ? "저장하지 않은 변경사항" : "아직 저장되지 않음";
    const when = formatRelativeTime(lastAutoSavedAt, now);
    const label = when ? `${when} 저장됨` : "저장됨";
    return isDirty ? `${label} · 수정 중` : label;
  }, [lastAutoSavedAt, isDirty, now]);
  const saveStatusTitle = lastAutoSavedAt ? `${formatClock(lastAutoSavedAt)}에 저장` : undefined;

  useAutoResizeTextarea(titleRef, title);
  useAutoResizeTextarea(subtitleRef, subtitle);

  useEffect(() => {
    if (!editor) return;
    let recoveryTimer;
    const onUpdate = () => {
      if (editor.isDestroyed) return;
      setDraftDirty((prev) => (prev ? prev : true));
      clearTimeout(recoveryTimer);
      recoveryTimer = setTimeout(() => captureRecovery(currentMetaRef.current), 700);
    };

    editor.on("update", onUpdate);
    return () => { clearTimeout(recoveryTimer); editor.off("update", onUpdate); };
  }, [editor, setDraftDirty, captureRecovery]);

  const editorReady = useEditorReady(editor);

  useEffect(() => {
    runAutosave({
      title,
      subtitle,
      category,
      cover,
      coverMedium,
      relatedEditionNos,
      excerpt,
      tags,
      author: authorName,
      authorEmail,
    });
  }, [runAutosave, title, subtitle, excerpt, tags, category, cover, coverMedium, relatedEditionNos, authorName, authorEmail]);

  useEffect(() => {
    if (!editor || !editorReady) return;

    const targetId = preloadedDraftId || articleId;
    if (!targetId) return;
    if (loadedDraftRef.current === targetId) return;

    let cancelled = false;

    (async () => {
      try {
        const success = await loadDraft(targetId, {
          setTitle,
          setSubtitle,
          setCategory,
          setCover,
          setCoverMedium,
          setRelatedEditionNos,
          setExcerpt,
          setTags,
        });

        if (success && !cancelled) {
          loadedDraftRef.current = targetId;
          setDraftDirty(false);
        }
      } catch (error) {
        console.error("[EditorPage] draft load failed:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    editor,
    editorReady,
    articleId,
    preloadedDraftId,
    loadDraft,
    setDraftDirty,
    setTitle,
    setSubtitle,
    setCategory,
    setCover,
    setCoverMedium,
    setRelatedEditionNos,
  ]);

  const { editorDocMeta, setEditorDocMeta, loadingEditorMeta } = useEditorDocMeta(draftId, articleId);
  useDraftConflictWatch(db, draftId, draftsApi.noteRemoteEditToken);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldOpenEditorOnboarding()) {
        setShowOnboarding(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const editingDisabled = draftsApi.isSaving || draftsApi.isDraftLoading || !!recoveryCandidate;
  const setters = { setTitle, setSubtitle, setCategory, setCover, setCoverMedium, setRelatedEditionNos, setExcerpt, setTags };
  const openPanel = (tab) => { setPanelTab(tab); setPanelOpen(true); setFocusMode(false); };
  const saveCurrent = async () => {
    const saved = await draftsApi.saveDraft({ markClean: true }, currentMetaRef.current);
    if (saved) setHistoryRefresh((value) => value + 1);
    return saved;
  };
  const openFindRef = useRef(null);
  const restoreSnapshot = async (snapshot) => {
    if (editingDisabled || !editor?.isInitialized) return false;
    if (draftsApi.isDirty && !await confirmEditor("현재 변경사항을 선택한 기록으로 바꿀까요?")) return false;
    const before = editor.getHTML();
    try { editor.commands.setContent(snapshot.contentHTML, { emitUpdate: false }); }
    catch { editor.commands.setContent(before, { emitUpdate: false }); toast("이 기록을 불러올 수 없어요."); return false; }
    // Snapshots hold only these fields; lead text, tags and related articles stay as they are.
    for (const name of ["title", "subtitle", "category", "cover", "coverMedium"]) {
      setters[`set${name[0].toUpperCase()}${name.slice(1)}`](snapshot[name] || (name === "category" ? DEFAULT_ARTICLE_CATEGORY : ""));
    }
    draftsApi.setIsDirty(true);
    draftsApi.holdAutosave?.();
    const restoredMeta = { ...currentMetaRef.current, ...snapshot };
    draftsApi.runAutosave(restoredMeta);
    draftsApi.captureRecovery(restoredMeta);
    toast("편집 화면에 복원했어요. 확인한 뒤 저장하거나 발행해 주세요.");
    return true;
  };

  const reloadAfterConflict = async () => {
    if (!draftId || !await confirmEditor("지금 화면의 변경사항 대신 저장된 최신본을 불러올까요? 이 기기에 남은 내 변경사항은 복구 초안으로 다시 열 수 있어요.")) return;
    draftsApi.captureRecovery(currentMetaRef.current);
    await loadDraft(draftId, setters);
  };
  const overwriteAfterConflict = async () => {
    if (!await confirmEditor("다른 곳에서 저장한 내용을 지금 화면의 글로 덮어쓸까요? 이전 내용은 ‘이력’ 탭에 남아요.")) return;
    draftsApi.overwriteConflict();
    await saveCurrent();
  };
  const openFind = () => {
    const { from, to, empty } = editor?.state.selection || {};
    const selected = !empty && editor ? editor.state.doc.textBetween(from, to, " ").slice(0, 100) : "";
    setFind((value) => ({ open: true, query: selected.includes("\n") ? "" : selected, token: value.token + 1 }));
  };

  const { saveDraft, isSaving, isDraftLoading, recovery } = draftsApi;
  useEffect(() => {
    const handleSave = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "/" && workspaceRef.current?.contains(event.target)) {
        event.preventDefault();
        setShowShortcuts((value) => !value);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "f" && workspaceRef.current?.contains(event.target)) {
        event.preventDefault();
        openFindRef.current();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s" && canWrite) {
        event.preventDefault();
        if (!isSaving && !isDraftLoading && !recovery) {
          saveDraft({ markClean: true }, currentMetaRef.current).then((saved) => { if (saved) setHistoryRefresh((value) => value + 1); });
        }
      }
    };
    window.addEventListener("keydown", handleSave);
    return () => window.removeEventListener("keydown", handleSave);
  }, [canWrite, saveDraft, isSaving, isDraftLoading, recovery]);

  // eslint-disable-next-line react-hooks/refs -- the shortcut handler reads the latest editor selection
  openFindRef.current = openFind;

  if (!canWrite) {
    return (
      <div className="p-40 text-center font-black italic uppercase tracking-widest text-[var(--uf-muted)]">
        Access Denied.
      </div>
    );
  }

  return (
    <div ref={workspaceRef} className={`uf-workspace ${focusMode ? "is-focus" : ""}`}>
      {confirmation}
      {dataRouter && <EditorLeaveGuard draftsApi={draftsApi} meta={currentMeta} />}
      <EditorConflictBanner conflict={draftsApi.conflict} disabled={draftsApi.isSaving || draftsApi.isDraftLoading}
        onReload={reloadAfterConflict} onOverwrite={overwriteAfterConflict} />
      <EditorRecoveryBanner
        draftsApi={draftsApi}
        editorReady={editorReady}
        isDirty={isDirty}
        confirmEditor={confirmEditor}
        setters={setters}
      />
      <main className="uf-workspace-main" inert={!!recoveryCandidate}>
        <EditorWorkspaceActions
          actionsRef={actionsRef}
          editor={editor}
          draftsApi={draftsApi}
          loadingEditorMeta={loadingEditorMeta}
          editorDocMeta={editorDocMeta}
          saveStatusText={saveStatusText}
          saveStatusTitle={saveStatusTitle}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          onOpenHelp={() => setShowShortcuts(true)}
          isDesktopEditor={isDesktopEditor}
          panelOpen={panelOpen}
          setPanelOpen={setPanelOpen}
          editorReady={editorReady}
          setPreviewContent={setPreviewContent}
          editingDisabled={editingDisabled}
          saveCurrent={saveCurrent}
          coverUploading={coverUploading}
          setShowChecks={setShowChecks}
          onOpenFind={openFind}
        />
        <div className="uf-toolbar-shell"><EditorToolbar editor={editor} isDarkMode={isDarkMode} onToast={onToast} />
          {find.open && <EditorFindReplace key={find.token} editor={editor} initialQuery={find.query} disabled={editingDisabled}
            onClose={() => setFind((value) => ({ ...value, open: false }))} onToast={onToast} />}
        </div>
        <div className="uf-writing-surface" aria-busy={draftsApi.isDraftLoading}>
          <textarea ref={titleRef} aria-label="글 제목" rows={1} placeholder="글 제목" value={title} disabled={draftsApi.isDraftLoading} onChange={(event) => { setTitle(event.target.value); setDraftDirty(true); }} className="uf-title-textarea uf-writing-title" />
          <textarea ref={subtitleRef} aria-label="부제목" rows={1} placeholder="부제목" value={subtitle} disabled={draftsApi.isDraftLoading} onChange={(event) => { setSubtitle(event.target.value); setDraftDirty(true); }}
            onKeyDown={(event) => {
              if (event.nativeEvent?.isComposing || event.nativeEvent?.keyCode === 229) return;
              if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); editor?.chain().focus().run(); }
              if (event.key === "Backspace" && !subtitle) { event.preventDefault(); titleRef.current?.focus(); }
            }} className="uf-subtitle-textarea uf-writing-subtitle" />
          <div className="editor-container relative">
            <SlashMenu pos={slashPos} onClose={closeSlashMenu} editor={editor} onToast={onToast} />
            {isDesktopEditor && <BlockSideInserter editor={editor} isDarkMode={isDarkMode} onToast={onToast} />}
            <BlockQuickBar editor={editor} isDarkMode={isDarkMode} />
            <SelectionFormatBubble editor={editor} disabled={editingDisabled} />
            <div ref={galleryContainerRef}><EditorContent editor={editor} onKeyDown={(event) => {
              if (event.nativeEvent?.isComposing || event.nativeEvent?.keyCode === 229) return;
              onEditorKeyDown(editor, event);
            }} onClick={() => closeSlashMenu()} /></div>
          </div>
        </div>
        <EditorOnboardingModal isOpen={showOnboarding} isDarkMode={isDarkMode} onClose={() => setShowOnboarding(false)} onNeverShowAgain={() => { hideEditorOnboardingForever(); setShowOnboarding(false); }} />
      </main>
      {(!isDesktopEditor || !focusMode) && <EditorToolsPanel desktop={isDesktopEditor} open={panelOpen} onClose={() => setPanelOpen(false)}>
        <div className="uf-panel-content" inert={!!recoveryCandidate}>
          <nav className="uf-panel-tabs" aria-label="편집 작업">
            {[["settings", SlidersHorizontal, "블록"], ["outline", ListTree, "목차"], ["document", FileText, "글 설정"], ["drafts", FileText, "초안"], ["history", History, "이력"], ["templates", LayoutTemplate, "템플릿"]].map(([tab, Icon, label]) => <button type="button" key={tab} aria-pressed={panelTab === tab} onClick={() => setPanelTab(tab)}><Icon size={17} />{label}</button>)}
          </nav>
          <div className="uf-panel-body">
            {panelTab === "settings" && <InspectorPanel embedded editor={editor} isDarkMode={isDarkMode} onToast={onToast} />}
            {panelTab === "outline" && <EditorOutline editor={editor} disabled={editingDisabled} onNavigate={(pos) => { if (!isDesktopEditor) setPanelOpen(false); requestAnimationFrame(() => focusEditorBlock(editor, pos)); }} />}
            {panelTab === "document" && (
              <EditorDocumentSettings
                title={title}
                subtitle={subtitle}
                excerpt={excerpt}
                setExcerpt={setExcerpt}
                tags={tags}
                setTags={setTags}
                excerptRef={excerptRef}
                category={category}
                setCategory={setCategory}
                cover={cover}
                setCover={setCover}
                coverMedium={coverMedium}
                setCoverMedium={setCoverMedium}
                editingDisabled={editingDisabled}
                setDraftDirty={setDraftDirty}
                uploadCover={uploadCover}
                coverUploading={coverUploading}
                coverProgress={coverProgress}
                toast={toast}
                db={db}
                relatedEditionNos={relatedEditionNos}
                setRelatedEditionNos={setRelatedEditionNos}
                selfEditionNo={editorDocMeta?.sourceEditionNo || editorDocMeta?.editionNo || ""}
              />
            )}
            {panelTab === "drafts" && (
              <EditorDraftList
                draftsApi={draftsApi}
                draftId={draftId}
                editingDisabled={editingDisabled}
                handleStartNewDraft={handleStartNewDraft}
                isDirty={isDirty}
                confirmEditor={confirmEditor}
                loadDraft={loadDraft}
                setters={setters}
                loadedDraftRef={loadedDraftRef}
                isDesktopEditor={isDesktopEditor}
                setPanelOpen={setPanelOpen}
              />
            )}
            <Suspense fallback={<p role="status" className="uf-empty">불러오는 중...</p>}>
              {panelTab === "history" && <EditorHistoryPanel db={db} articleId={draftId || articleId} sourceArticleId={editorDocMeta?.sourceArticleId} userId={user?.uid} getSnapshot={() => ({ ...currentMetaRef.current, contentHTML: editor.getHTML() })} onRestore={restoreSnapshot} disabled={editingDisabled} refreshKey={historyRefresh} />}
              {panelTab === "templates" && <EditorTemplatesPanel editor={editor} userId={user?.uid} getSnapshot={() => ({ ...currentMetaRef.current, contentHTML: editor.getHTML() })} onApply={(template) => restoreSnapshot(template.snapshot)} onToast={onToast} disabled={editingDisabled} />}
            </Suspense>
          </div>
        </div>
      </EditorToolsPanel>}
      <Suspense fallback={<p role="status" className="uf-overlay-loading">불러오는 중...</p>}>
        {previewContent && <EditorPreview content={previewContent} meta={{ ...currentMeta, author: editorDocMeta?.author || authorName, editionNo: editorDocMeta?.sourceEditionNo || editorDocMeta?.editionNo || '미발행' }} isDarkMode={isDarkMode} onClose={() => setPreviewContent(null)} />}
        {showChecks && <PublicationChecklist editor={editor} meta={currentMeta} isSaving={draftsApi.isSaving} onClose={() => setShowChecks(false)} onFocusIssue={(issue) => {
          setShowChecks(false);
          if (typeof issue.position === "number") { if (!isDesktopEditor) setPanelOpen(false); focusEditorBlock(editor, issue.position); }
          else if (issue.field === "title") titleRef.current?.focus();
          else if (issue.field === "cover") openPanel("document");
          else if (issue.field === "excerpt") { openPanel("document"); requestAnimationFrame(() => requestAnimationFrame(() => excerptRef.current?.focus())); }
        }} onPublish={async () => { const success = await draftsApi.publish(currentMetaRef.current); if (success) setShowChecks(false); return success; }} />}
      </Suspense>
      <FootnoteEditor editor={editor} />
      <EditorInputDialog />
      <EditorShortcutsDialog open={showShortcuts} onClose={() => setShowShortcuts(false)} onOpenGuide={() => setShowOnboarding(true)} />
      <EditorWorkspaceStyles />
    </div>
  );
}
