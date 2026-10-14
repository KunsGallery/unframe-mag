// src/Pages/EditorPage.jsx
import React, { lazy, Suspense, useContext, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { UNSAFE_DataRouterContext, useBlocker, useLocation, useNavigate, useParams } from "react-router-dom";
import { Save, Send, Plus, CircleHelp, RotateCcw, Trash2, Eye, ListTree, SlidersHorizontal, History, LayoutTemplate, FileText, PanelRightClose, PanelRightOpen, Maximize2 } from "lucide-react";

import { useEditor, EditorContent } from "@tiptap/react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";

import SlashMenu from "../components/editor/SlashMenu";
import EditorToolbar from "../components/editor/EditorToolbar";
import InspectorPanel from "../components/editor/InspectorPanel";
import EditorOutline from "../components/editor/EditorOutline";
import EditorToolsPanel from "../components/editor/EditorToolsPanel";
import { focusEditorBlock } from "../lib/editorOutline";
const EditorPreview = lazy(() => import("../components/editor/EditorPreview"));
const PublicationChecklist = lazy(() => import("../components/editor/PublicationChecklist"));
const EditorHistoryPanel = lazy(() => import("../components/editor/EditorHistoryPanel"));
const EditorTemplatesPanel = lazy(() => import("../components/editor/EditorTemplatesPanel"));
import BlockQuickBar from "../components/editor/BlockQuickBar";
import BlockSideInserter from "../components/editor/BlockSideInserter";

import UploadButton from "../components/editor/UploadButton";
import { useUploadImage } from "../hooks/useUploadImage";
import { uploadImageWithProgress } from "../lib/uploadWithProgress";

import { createEditorConfig } from "../tiptap/editorConfig";
import { useDrafts } from "../hooks/useDrafts";
import { useEditorConfirmation } from "../hooks/useEditorConfirmation";
import { useSlideGalleryRuntime } from "../hooks/useSlideGalleryRuntime";
import { useSlashMenu } from "../hooks/useSlashMenu";
import EditorOnboardingModal from "../components/editor/EditorOnboardingModal";
import {
  shouldOpenEditorOnboarding,
  hideEditorOnboardingForever,
} from "../lib/editorOnboarding";
import { isAdminEmail } from "../constants/admin";
import { ARTICLE_CATEGORIES, DEFAULT_ARTICLE_CATEGORY } from "../constants/categories";

function useIsDesktopEditor() {
  const [isDesktopEditor, setIsDesktopEditor] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopEditor(media.matches);

    sync();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  return isDesktopEditor;
}

function EditorLeaveGuard({ draftsApi, meta }) {
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
  const [cover, setCover] = useState("");
  const [coverMedium, setCoverMedium] = useState("");
  const [panelTab, setPanelTab] = useState("settings");
  const [panelOpen, setPanelOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [showChecks, setShowChecks] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
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
        onUploadImage: async (file) => uploadImageWithProgress(file),
        onToast,
      }),
    [onToast]
  );

  const editor = useEditor(editorConfig);
  const galleryContainerRef = useRef(null);
  useSlideGalleryRuntime(galleryContainerRef, editor);

  const [editorDocMeta, setEditorDocMeta] = useState(null);
  const [loadingEditorMeta, setLoadingEditorMeta] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

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
    });
    setEditorDocMeta(null);
  };

  useEffect(() => {
    if (!editor) return;
    const handler = (e) => {
      const url = e.detail?.url;
      if (url && editor.isEditable) editor.chain().focus().setImage({ src: url }).run();
    };
    window.addEventListener("uf:insert-image", handler);
    return () => window.removeEventListener("uf:insert-image", handler);
  }, [editor]);

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
  const currentMeta = { title, subtitle, category, cover, coverMedium, author: authorName, authorEmail };
  const currentMetaRef = useRef(currentMeta);
  currentMetaRef.current = currentMeta;

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(canWrite && !recoveryCandidate);
  }, [editor, canWrite, recoveryCandidate]);

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeLeaving = (event) => {
      captureRecovery(currentMetaRef.current);
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty, captureRecovery]);

  useEffect(() => {
    const preserve = () => captureRecovery(currentMetaRef.current);
    const onVisibility = () => { if (document.visibilityState === "hidden") preserve(); };
    window.addEventListener("pagehide", preserve);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      preserve();
      window.removeEventListener("pagehide", preserve);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [captureRecovery]);

  const saveStatusText = useMemo(() => {
    if (!lastAutoSavedAt) return isDirty ? "저장하지 않은 변경사항" : "아직 저장되지 않음";

    try {
      const d =
        typeof lastAutoSavedAt?.toDate === "function"
          ? lastAutoSavedAt.toDate()
          : new Date(lastAutoSavedAt);

      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");

      return isDirty ? `${hh}:${mm} 저장 후 수정 중` : `${hh}:${mm} 저장됨`;
    } catch {
      return isDirty ? "저장하지 않은 변경사항" : "저장됨";
    }
  }, [lastAutoSavedAt, isDirty]);

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useLayoutEffect(() => {
    const el = subtitleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [subtitle]);

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

  useEffect(() => {
    if (!editor) {
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

  useEffect(() => {
    runAutosave({
      title,
      subtitle,
      category,
      cover,
      coverMedium,
      author: authorName,
      authorEmail,
    });
  }, [runAutosave, title, subtitle, category, cover, coverMedium, authorName, authorEmail]);

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
  ]);

  useEffect(() => {
    const currentId = draftId || articleId;
    if (!currentId) {
      setEditorDocMeta(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoadingEditorMeta(true);
        const snap = await getDoc(doc(db, "articles", currentId));
        if (cancelled) return;

        if (snap.exists()) {
          setEditorDocMeta({ id: snap.id, ...snap.data() });
        } else {
          setEditorDocMeta(null);
        }
      } catch (e) {
        console.error("[EditorPage] meta load failed:", e);
        if (!cancelled) setEditorDocMeta(null);
      } finally {
        if (!cancelled) setLoadingEditorMeta(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [draftId, articleId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldOpenEditorOnboarding()) {
        setShowOnboarding(true);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const editingDisabled = draftsApi.isSaving || draftsApi.isDraftLoading || !!recoveryCandidate;
  const setters = { setTitle, setSubtitle, setCategory, setCover, setCoverMedium };
  const openPanel = (tab) => { setPanelTab(tab); setPanelOpen(true); setFocusMode(false); };
  const saveCurrent = async () => {
    const saved = await draftsApi.saveDraft({ markClean: true }, currentMetaRef.current);
    if (saved) setHistoryRefresh((value) => value + 1);
    return saved;
  };
  const restoreSnapshot = async (snapshot) => {
    if (editingDisabled || !editor?.isInitialized) return false;
    if (draftsApi.isDirty && !await confirmEditor("현재 변경사항을 선택한 기록으로 바꿀까요?")) return false;
    const before = editor.getHTML();
    try { editor.commands.setContent(snapshot.contentHTML, { emitUpdate: false }); }
    catch { editor.commands.setContent(before, { emitUpdate: false }); toast("이 기록을 불러올 수 없어요."); return false; }
    for (const [key, setter] of Object.entries(setters)) {
      const field = key.slice(3); const name = field[0].toLowerCase() + field.slice(1);
      setter(snapshot[name] || (name === "category" ? DEFAULT_ARTICLE_CATEGORY : ""));
    }
    draftsApi.setIsDirty(true);
    draftsApi.holdAutosave?.();
    const restoredMeta = { ...currentMetaRef.current, ...snapshot };
    draftsApi.runAutosave(restoredMeta);
    draftsApi.captureRecovery(restoredMeta);
    toast("편집 화면에 복원했어요. 확인한 뒤 저장하거나 발행해 주세요.");
    return true;
  };

  const { saveDraft, isSaving, isDraftLoading, recovery } = draftsApi;
  useEffect(() => {
    const handleSave = (event) => {
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
      <main className="uf-workspace-main" inert={!!recoveryCandidate}>
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
        <div className="uf-toolbar-shell"><EditorToolbar editor={editor} isDarkMode={isDarkMode} onToast={onToast} /></div>
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
            {panelTab === "document" && <section className="uf-document-settings">
              <h2>글 설정</h2>
              <label>카테고리<select value={category} disabled={editingDisabled} onChange={(event) => { setCategory(event.target.value); setDraftDirty(true); }}>{ARTICLE_CATEGORIES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
              <label>대표 이미지{(coverMedium || cover) && <img src={coverMedium || cover} alt="대표 이미지" />}</label>
              <UploadButton label="대표 이미지 업로드" title="대표 이미지 업로드" uploading={coverUploading} progress={coverProgress} disabled={editingDisabled} onPickFile={async (file) => {
                try { const result = await uploadCover(file, { variant: "cover" }); setCover(result.url); setCoverMedium(result.coverMedium || result.url); setDraftDirty(true); }
                catch { toast("대표 이미지 업로드에 실패했어요."); }
              }} />
              <label>대표 이미지 주소<input type="url" value={cover} disabled={editingDisabled} onChange={(event) => { setCover(event.target.value); setDraftDirty(true); }} /></label>
              <details><summary>이미지 고급 설정</summary><label>목록용 이미지 주소<input type="url" value={coverMedium} disabled={editingDisabled} onChange={(event) => { setCoverMedium(event.target.value); setDraftDirty(true); }} /></label></details>
              {cover && <button type="button" disabled={editingDisabled || coverUploading} onClick={() => { setCover(""); setCoverMedium(""); setDraftDirty(true); }}><Trash2 size={16} />대표 이미지 삭제</button>}
            </section>}
            {panelTab === "drafts" && <section className="uf-draft-list"><div className="uf-panel-heading"><h2>내 초안</h2><button type="button" disabled={editingDisabled} onClick={handleStartNewDraft}><Plus size={16} />새 글</button></div>
              {!draftsApi.drafts.length && <p className="uf-empty">저장한 초안이 없어요.</p>}
              {draftsApi.drafts.map((draft) => <button type="button" key={draft.id} disabled={editingDisabled} aria-current={draftId === draft.id ? "true" : undefined} onClick={async () => {
                if (isDirty && !await confirmEditor("저장하지 않은 변경사항을 버리고 다른 초안을 열까요?")) return;
                const success = await loadDraft(draft.id, setters);
                if (success) { loadedDraftRef.current = draft.id; if (!isDesktopEditor) setPanelOpen(false); }
              }}><strong>{draft.title || "제목 없는 초안"}</strong><span>{draft.category || DEFAULT_ARTICLE_CATEGORY}</span></button>)}
            </section>}
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
        }} onPublish={async () => { const success = await draftsApi.publish(currentMetaRef.current); if (success) setShowChecks(false); return success; }} />}
      </Suspense>
      <style data-uf-editor-styles>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .uf-title-textarea,
        .uf-subtitle-textarea {
          overflow: hidden;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--uf-muted);
          pointer-events: none;
          height: 0;
        }

        .ProseMirror.uf-editor {
          min-height: 500px;
          outline: none;
        }

        .uf-editor,
        .uf-prose{
          color: inherit;
          font-style: normal;
          font-weight: 300;
          font-size: 18px;
          line-height: 1.95;
          letter-spacing: 0.01em;
          word-break: keep-all;
          overflow-wrap: break-word;
        }

        .uf-editor p,
        .uf-prose p{
          margin: 0 0 1.6em;
        }

        .uf-editor h1,
        .uf-editor h2,
        .uf-editor h3,
        .uf-prose h1,
        .uf-prose h2,
        .uf-prose h3{
          font-style: italic;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin: 1.2em 0 0.5em;
        }

        .uf-editor h1,
        .uf-prose h1{ font-size: 3.4rem; }

        .uf-editor h2,
        .uf-prose h2{ font-size: 2.4rem; }

        .uf-editor h3,
        .uf-prose h3{ font-size: 1.7rem; }

        .uf-editor blockquote,
        .uf-prose blockquote{
          margin: 2em 0;
          padding-left: 1.25em;
          border-left: 1px solid rgba(0, 74, 173, 0.72);
          font-style: italic;
        }

        .uf-editor ul,
        .uf-editor ol,
        .uf-prose ul,
        .uf-prose ol{
          margin: 0 0 1.6em 1.25em;
          padding-left: 1.1em;
        }

        .uf-editor li,
        .uf-prose li{
          margin: 0.35em 0;
        }

        .uf-editor hr,
        .uf-prose hr{
          margin: 3em 0;
          border: 0;
          border-top: 1px solid rgba(113,113,122,.25);
        }

        .uf-editor img, .uf-prose img{
          display: block;
          max-width: 100%;
          height: auto;
        }

        /* ===== Editor-only UfImage overrides ===== */
        .uf-editor .uf-img {
          width: 100%;
          max-width: 100%;
        }

        .uf-editor .uf-img.is-xsmall {
          max-width: 320px;
        }

        .uf-editor .uf-img.is-small {
          max-width: 460px;
        }

        .uf-editor .uf-img.is-normal {
          max-width: 720px;
        }

        .uf-editor .uf-img.is-wide {
          max-width: min(900px, 100%);
        }

        /* ✅ 에디터에서는 full도 편집 영역 안에서만 */
        .uf-editor .uf-img.is-full {
          width: 100%;
          max-width: 100%;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }

        /* ✅ 정렬이 눈에 띄게 보이도록 wrapper 기준으로 처리 */
        .uf-editor .uf-img.align-left {
          margin-left: 0;
          margin-right: auto;
        }

        .uf-editor .uf-img.align-center {
          margin-left: auto;
          margin-right: auto;
        }

        .uf-editor .uf-img.align-right {
          margin-left: auto;
          margin-right: 0;
        }

        /* 에디터 안에서는 정렬 확인이 잘 되도록 살짝 가이드 */
        .uf-editor .uf-img.align-left,
        .uf-editor .uf-img.align-center,
        .uf-editor .uf-img.align-right {
          transition: opacity .18s ease, transform .18s ease;
        }

        .uf-editor pre,
        .uf-prose pre{
          margin: 1.8em 0;
          padding: 1.1em 1.2em;
          border-radius: 16px;
          overflow-x: auto;
        }

        .uf-editor :last-child,
        .uf-prose :last-child{
          margin-bottom: 0;
        }

        .uf-editor :is(p, h1, h2, h3, blockquote, ul, ol, pre){
          position: relative;
        }

        .uf-editor :is(p, h1, h2, h3, blockquote, ul, ol, pre):hover::before{
          content: "⋮⋮";
          position: absolute;
          left: -28px;
          top: .2rem;
          font-size: 14px;
          letter-spacing: 2px;
          opacity: .35;
          color: #004aad;
        }

        .uf-editor .uf-divider,
        .uf-prose .uf-divider{
          width: 100%;
          margin: 3em 0;
          position: relative;
        }

        .uf-editor .uf-divider.is-line,
        .uf-prose .uf-divider.is-line{
          height: 1px;
          background: rgba(113,113,122,.25);
        }

        .uf-editor .uf-divider.is-dashed,
        .uf-prose .uf-divider.is-dashed{
          height: 0;
          border-top: 1px dashed rgba(113,113,122,.35);
        }

        .uf-editor .uf-divider.is-double,
        .uf-prose .uf-divider.is-double{
          height: 8px;
          border-top: 1px solid rgba(113,113,122,.28);
          border-bottom: 1px solid rgba(113,113,122,.28);
        }

        .uf-editor .uf-divider.is-dots,
        .uf-prose .uf-divider.is-dots{
          height: 10px;
          background:
            radial-gradient(circle, rgba(113,113,122,.45) 1.5px, transparent 1.7px)
            center / 14px 10px repeat-x;
        }

        .uf-editor .uf-divider.is-fade,
        .uf-prose .uf-divider.is-fade{
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(113,113,122,.38), transparent);
        }

        .uf-editor .uf-divider.is-glow,
        .uf-prose .uf-divider.is-glow{
          height: 2px;
          background: linear-gradient(90deg, transparent, #004aad, transparent);
          box-shadow: 0 0 18px rgba(0,74,173,.35);
        }

        .uf-editor .uf-divider.is-space,
        .uf-prose .uf-divider.is-space{
          height: 48px;
        }

        .uf-editor .uf-callout,
        .uf-prose .uf-callout{
          margin: 2.2em 0;
          padding: 1.2em 1.2em 1.15em;
          border: 1px solid rgba(113,113,122,.18);
          border-radius: 22px;
          background: rgba(255,255,255,.55);
          backdrop-filter: blur(12px);
          position: relative;
          overflow: hidden;
        }

        .dark .uf-editor .uf-callout,
        .dark .uf-prose .uf-callout{
          background: rgba(24,24,27,.62);
          border-color: rgba(255,255,255,.08);
        }

        .uf-editor .uf-callout::before,
        .uf-prose .uf-callout::before{
          content: "";
          position: absolute;
          inset: 0 auto 0 0;
          width: 4px;
          background: rgba(0,74,173,.7);
        }

        .uf-editor .uf-callout__label,
        .uf-prose .uf-callout__label{
          margin-bottom: .8em;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .28em;
          text-transform: uppercase;
          color: #004aad;
        }

        .uf-editor .uf-callout__body > :last-child,
        .uf-prose .uf-callout__body > :last-child{
          margin-bottom: 0;
        }

        .uf-editor .uf-callout.is-note,
        .uf-prose .uf-callout.is-note{
          background: rgba(255,255,255,.58);
          border-color: rgba(113,113,122,.16);
        }
        .dark .uf-editor .uf-callout.is-note,
        .dark .uf-prose .uf-callout.is-note{
          background: rgba(24,24,27,.62);
        }
        .uf-editor .uf-callout.is-note::before,
        .uf-prose .uf-callout.is-note::before{
          background: rgba(0,74,173,.72);
        }
        .uf-editor .uf-callout.is-note .uf-callout__label,
        .uf-prose .uf-callout.is-note .uf-callout__label{
          color: #004aad;
        }

        .uf-editor .uf-callout.is-point,
        .uf-prose .uf-callout.is-point{
          background: linear-gradient(180deg, rgba(0,74,173,.08), rgba(255,255,255,.7));
          border-color: rgba(0,74,173,.24);
          box-shadow: 0 10px 30px rgba(0,74,173,.08);
        }
        .dark .uf-editor .uf-callout.is-point,
        .dark .uf-prose .uf-callout.is-point{
          background: linear-gradient(180deg, rgba(0,74,173,.18), rgba(24,24,27,.72));
          border-color: rgba(0,74,173,.24);
        }
        .uf-editor .uf-callout.is-point::before,
        .uf-prose .uf-callout.is-point::before{
          background: #004aad;
        }
        .uf-editor .uf-callout.is-point .uf-callout__label,
        .uf-prose .uf-callout.is-point .uf-callout__label{
          color: #004aad;
        }

        .uf-editor .uf-callout.is-info,
        .uf-prose .uf-callout.is-info{
          background: linear-gradient(180deg, rgba(16,185,129,.06), rgba(255,255,255,.68));
          border-color: rgba(16,185,129,.24);
        }
        .dark .uf-editor .uf-callout.is-info,
        .dark .uf-prose .uf-callout.is-info{
          background: linear-gradient(180deg, rgba(16,185,129,.12), rgba(24,24,27,.72));
          border-color: rgba(16,185,129,.22);
        }
        .uf-editor .uf-callout.is-info::before,
        .uf-prose .uf-callout.is-info::before{
          background: rgba(16,185,129,.85);
        }
        .uf-editor .uf-callout.is-info .uf-callout__label,
        .uf-prose .uf-callout.is-info .uf-callout__label{
          color: rgba(5,150,105,1);
        }

        .uf-editor .uf-callout.is-quote,
        .uf-prose .uf-callout.is-quote{
          background: rgba(244,244,245,.72);
          border-color: rgba(113,113,122,.18);
        }
        .dark .uf-editor .uf-callout.is-quote,
        .dark .uf-prose .uf-callout.is-quote{
          background: rgba(39,39,42,.82);
        }
        .uf-editor .uf-callout.is-quote::before,
        .uf-prose .uf-callout.is-quote::before{
          background: rgba(161,161,170,.9);
        }
        .uf-editor .uf-callout.is-quote .uf-callout__label,
        .uf-prose .uf-callout.is-quote .uf-callout__label{
          color: rgba(113,113,122,1);
        }
        .uf-editor .uf-callout.is-quote .uf-callout__body,
        .uf-prose .uf-callout.is-quote .uf-callout__body{
          font-style: italic;
        }

                /* ===== Editor-only Columns visibility ===== */
        .uf-editor .uf-columns {
          position: relative;
          display: grid;
          gap: var(--uf-columns-gap, 24px);
          margin: 2.2rem 0;
          padding: 14px;
          border: 1px dashed rgba(0, 74, 173, 0.28);
          border-radius: 20px;
          background: rgba(0, 74, 173, 0.03);
        }

        .dark .uf-editor .uf-columns {
          border-color: rgba(125, 181, 255, 0.22);
          background: rgba(0, 74, 173, 0.08);
        }

        .uf-editor .uf-columns[data-columns="2"] {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .uf-editor .uf-columns[data-columns="3"] {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .uf-editor .uf-columns[data-valign="center"] {
          align-items: center;
        }

        .uf-editor .uf-column {
          min-width: 0;
          padding: 14px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.68);
          border: 1px solid rgba(0, 0, 0, 0.06);
          box-sizing: border-box;
        }

        .dark .uf-editor .uf-column {
          background: rgba(24, 24, 27, 0.72);
          border-color: rgba(255, 255, 255, 0.06);
        }

        .uf-editor .uf-column > :first-child {
          margin-top: 0;
        }

        .uf-editor .uf-column > :last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}
