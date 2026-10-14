import React, { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import UserRewardsPanel from "../components/admin/UserRewardsPanel";
import { isAdminEmail } from "../constants/admin";
import { Save } from "lucide-react";
import { normalizeNetworkConfig, normalizeSiteUrl, SITE_LINK_FIELDS } from "../lib/siteLinks";

export default function AdminPage({ user, isDarkMode, onToast }) {
  const toast = useCallback((m) => (onToast ? onToast(m) : console.log(m)), [onToast]);
  const isAdmin = isAdminEmail(user?.email);

  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);

  const [heroEditionNo, setHeroEditionNo] = useState(null);
  const [editorPicks, setEditorPicks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [networkDraft, setNetworkDraft] = useState(() => normalizeNetworkConfig(null));
  const [networkLoading, setNetworkLoading] = useState(true);
  const [networkLoadError, setNetworkLoadError] = useState(false);
  const [networkSaving, setNetworkSaving] = useState(false);
  const [linkErrors, setLinkErrors] = useState({});

  const loadNetwork = useCallback(async () => {
    setNetworkLoading(true);
    setNetworkLoadError(false);
    try {
      const snap = await getDoc(doc(db, "config", "network"));
      const data = snap.exists() ? snap.data() : {};
      // Keep invalid existing input visible so an administrator can repair it.
      const draft = normalizeNetworkConfig(data);
      for (const field of SITE_LINK_FIELDS) {
        const value = field.network ? data.links?.[field.key] : data[field.key];
        const input = value == null ? "" : String(value);
        if (field.network) draft.links[field.key] = input;
        else draft[field.key] = input;
      }
      setNetworkDraft(draft);
    } catch (e) {
      console.error(e);
      setNetworkLoadError(true);
      toast("네트워크 설정을 불러오지 못했어요. 다시 시도해 주세요.");
    } finally {
      setNetworkLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) loadNetwork();
  }, [isAdmin, loadNetwork]);

  useEffect(() => {
    if (!isAdmin) return;

    (async () => {
      try {
        const ref = doc(db, "config", "home");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() || {};
          setHeroEditionNo(data.heroEditionNo || null);
          setEditorPicks(Array.isArray(data.editorPicks) ? data.editorPicks : []);
        }
      } catch (e) {
        console.error(e);
        toast("홈 설정을 불러오지 못했어요. 다시 시도해 주세요.");
      }
    })();
  }, [isAdmin, toast]);

  const saveNetwork = async (event) => {
    event.preventDefault();
    if (!isAdmin || networkLoading || networkLoadError || networkSaving) return;
    const errors = {};
    const values = { links: {} };
    for (const field of SITE_LINK_FIELDS) {
      try {
        const normalized = normalizeSiteUrl(field.network ? networkDraft.links[field.key] : networkDraft[field.key]);
        if (field.network) values.links[field.key] = normalized;
        else values[field.key] = normalized;
      } catch {
        errors[field.key] = "공백이나 로그인 정보가 없는 올바른 HTTPS URL을 입력해 주세요.";
      }
    }
    setLinkErrors(errors);
    if (Object.keys(errors).length) {
      toast("링크를 저장하지 못했어요. 표시된 URL을 확인해 주세요.");
      return;
    }
    setNetworkSaving(true);
    try {
      await setDoc(doc(db, "config", "network"), { ...values, updatedAt: new Date(), updatedBy: user?.email || user?.uid || null }, { merge: true });
      setNetworkDraft((prev) => ({ ...prev, ...values }));
      toast("네트워크 링크 저장 완료!");
    } catch (e) {
      console.error(e);
      toast("네트워크 링크를 저장하지 못했어요. 권한과 연결을 확인해 주세요.");
    } finally {
      setNetworkSaving(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    (async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "articles"),
          where("status", "==", "published"),
          orderBy("sortIndex", "desc")
        );
        const snap = await getDocs(q);
        setArticles(snap.docs.map((d) => ({ docId: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
        toast("published 글 목록을 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, toast]);

  const togglePick = (editionNo) => {
    setEditorPicks((prev) => {
      const s = new Set(prev);
      if (s.has(editionNo)) s.delete(editionNo);
      else {
        if (s.size >= 6) {
          toast("에디터픽은 최대 6개까지 가능해요.");
          return prev;
        }
        s.add(editionNo);
      }
      return Array.from(s);
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const ref = doc(db, "config", "home");
      await setDoc(
        ref,
        {
          heroEditionNo: heroEditionNo || null,
          editorPicks,
          updatedAt: new Date(),
          updatedBy: user?.email || null,
        },
        { merge: true }
      );
      toast("홈 설정 저장 완료!");
    } catch (e) {
      console.error(e);
      toast("저장 실패(권한/규칙 확인)");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArticle = async (article) => {
    if (!article?.docId) return;

    const ok = window.confirm(
      `정말 이 아티클을 삭제할까요?\n\n#${String(article.editionNo || "").padStart(3, "0")} ${article.title || "Untitled"}`
    );
    if (!ok) return;

    setDeletingId(article.docId);
    try {
      await deleteDoc(doc(db, "articles", article.docId));

      setArticles((prev) => prev.filter((a) => a.docId !== article.docId));

      if (heroEditionNo === article.editionNo) {
        setHeroEditionNo(null);
      }

      setEditorPicks((prev) => prev.filter((no) => no !== article.editionNo));

      toast("아티클 삭제 완료");
    } catch (e) {
      console.error(e);
      toast("아티클 삭제 실패");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-24 text-center font-black italic uppercase tracking-widest text-[var(--uf-muted)]">
        Admin only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-24 text-center font-black italic uppercase tracking-widest text-[var(--uf-muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--uf-bg)] text-[var(--uf-text)]">
      <div className="max-w-[1100px] mx-auto px-6 py-16">
        <div className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
              / ADMIN
            </div>
            <h1 className="mt-4 text-4xl font-black italic uppercase tracking-tighter">
              Home Curation
            </h1>
            <p className="mt-3 text-sm opacity-70">
              히어로 1개 + 에디터픽 최대 6개를 지정해요.
            </p>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-4 rounded-2xl bg-[#004aad] text-white font-black text-xs tracking-[0.4em] uppercase italic disabled:opacity-50"
            type="button"
          >
            {saving ? "SAVING…" : "SAVE"}
          </button>
        </div>

        <section className="mt-12 border-t border-[var(--uf-border)] pt-8">
          <h2 className="text-2xl font-black italic uppercase">Network & Site Links</h2>
          {networkLoadError ? (
            <div className="mt-4" role="alert">
              <p>네트워크 설정을 불러오지 못했어요.</p>
              <button type="button" onClick={loadNetwork} className="mt-3 underline underline-offset-4">다시 시도</button>
            </div>
          ) : (
            <form onSubmit={saveNetwork} noValidate className="mt-6">
              <fieldset disabled={networkLoading || networkSaving} className="grid gap-5 md:grid-cols-2 min-w-0">
                {SITE_LINK_FIELDS.map((field) => (
                  <div key={field.key} className="min-w-0">
                    <label htmlFor={`site-link-${field.key}`} className="block text-sm font-bold mb-2">{field.label}</label>
                    <input
                      id={`site-link-${field.key}`}
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      value={field.network ? networkDraft.links[field.key] : networkDraft[field.key]}
                      onChange={(event) => {
                        const value = event.target.value;
                        setNetworkDraft((prev) => field.network ? { ...prev, links: { ...prev.links, [field.key]: value } } : { ...prev, [field.key]: value });
                        setLinkErrors((prev) => ({ ...prev, [field.key]: "" }));
                      }}
                      aria-invalid={!!linkErrors[field.key]}
                      aria-describedby={linkErrors[field.key] ? `site-error-${field.key}` : undefined}
                      className="w-full min-w-0 rounded-lg border border-[var(--uf-border)] bg-[var(--uf-bg)] px-3 py-3 text-base focus-visible:outline-2 focus-visible:outline-[#004aad] disabled:opacity-50"
                    />
                    {linkErrors[field.key] && <p id={`site-error-${field.key}`} className="mt-2 text-sm" role="alert">{linkErrors[field.key]}</p>}
                  </div>
                ))}
              </fieldset>
              <button type="submit" disabled={networkLoading || networkSaving} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#004aad] text-white px-5 py-3 font-bold disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4">
                <Save size={18} aria-hidden="true" />
                {networkLoading ? "Loading…" : networkSaving ? "Saving…" : "Save Links"}
              </button>
            </form>
          )}
        </section>

        <UserRewardsPanel
          isAdmin={isAdmin}
          adminEmail={user?.email}
          isDarkMode={isDarkMode}
          onToast={onToast}
        />

        <div className="mt-10 grid md:grid-cols-2 gap-6">
          <div className={`rounded-2xl border p-6 ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
            <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
              Hero (1)
            </div>
            <div className="mt-4 space-y-2">
              {articles.slice(0, 20).map((a) => (
                <div
                  key={a.docId}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <label className="flex items-center gap-3 min-w-0 flex-1">
                    <input
                      type="radio"
                      name="hero"
                      checked={heroEditionNo === a.editionNo}
                      onChange={() => setHeroEditionNo(a.editionNo)}
                    />
                    <span className="text-xs font-black opacity-70">
                      #{String(a.editionNo).padStart(3, "0")}
                    </span>
                    <span className="text-sm font-black line-clamp-1">
                      {a.title || "Untitled"}
                    </span>
                  </label>

                  <button
                    onClick={() => handleDeleteArticle(a)}
                    disabled={deletingId === a.docId}
                    className="shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic border border-red-300 text-red-500 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                    type="button"
                  >
                    {deletingId === a.docId ? "Deleting…" : "Delete"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-6 ${isDarkMode ? "border-zinc-800" : "border-zinc-200"}`}>
            <div className="text-[10px] tracking-[0.5em] uppercase italic font-black opacity-60">
              Editor Picks (max 6)
            </div>
            <div className="mt-4 space-y-2">
              {articles.slice(0, 30).map((a) => {
                const checked = editorPicks.includes(a.editionNo);
                return (
                  <div
                    key={a.docId}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <label className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePick(a.editionNo)}
                      />
                      <span className="text-xs font-black opacity-70">
                        #{String(a.editionNo).padStart(3, "0")}
                      </span>
                      <span className="text-sm font-black line-clamp-1">
                        {a.title || "Untitled"}
                      </span>
                    </label>

                    <button
                      onClick={() => handleDeleteArticle(a)}
                      disabled={deletingId === a.docId}
                      className="shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic border border-red-300 text-red-500 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                      type="button"
                    >
                      {deletingId === a.docId ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-xs opacity-70">
              선택됨: <b>{editorPicks.length}</b>/6
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
