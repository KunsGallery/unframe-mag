import React, { lazy, Suspense, useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Edit3, LogOut, Menu, X } from "lucide-react";

// Firebase
import { auth, googleProvider, db } from "./firebase/config";
import {
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp, runTransaction } from "firebase/firestore";

// PWA
import InstallPrompt from "./components/pwa/InstallPrompt";
import { isAdminEmail } from "./constants/admin";

// Pages
const HomePage = lazy(() => import("./Pages/HomePage"));
const AboutPage = lazy(() => import("./Pages/AboutPage"));
const EditorPage = lazy(() => import("./Pages/EditorPage"));
const MyPage = lazy(() => import("./Pages/MyPage"));
const ViewPage = lazy(() => import("./Pages/ViewPage"));
const AdminPage = lazy(() => import("./Pages/AdminPage"));
import ErrorBoundary from "./components/debug/ErrorBoundary";
import {
  MobileDebugRuntimeOverlay,
} from "./components/debug/MobileDebugOverlay";
import {
  useIsMobileViewport,
  useMobileDebugEnabled,
} from "./components/debug/debugHooks";
import { useTheme } from "./hooks/useTheme";
import ThemeToggle from "./components/common/ThemeToggle";
import { useNetworkConfig } from "./hooks/useNetworkConfig";
import { getSiteLinks } from "./lib/siteLinks";
import { reportClientError } from "./lib/runtimeDiagnostics";

function safeNicknameFromDisplayName(displayName) {
  const base = String(displayName || "User")
    .trim()
    .replace(/\s+/g, "");
  const nick = base.slice(0, 20);
  return nick.length ? nick : "User";
}

// ----------------------------------------------------------------------------
// Shared Components
// ----------------------------------------------------------------------------
const Navbar = ({ toggleTheme, isDarkMode, user, role, onLogin, onLogout }) => {
  const location = useLocation();
  const [openPath, setOpenPath] = useState(null);
  const menuOpen = openPath === location.pathname;

  const isAdmin = !!user && isAdminEmail(user.email);
  const isEditor = !!user && role === "editor";
  const canWrite = isAdmin || isEditor;

  return (
    <nav
      className={`h-[80px] border-b px-6 md:px-12 flex justify-between items-center sticky top-0 z-100 transition-all duration-500 ${
        isDarkMode ? "bg-black/90 border-zinc-900" : "bg-white/90 border-zinc-50"
      } backdrop-blur-3xl shadow-sm`}
    >
      <div className="flex items-center gap-20">
        <Link
          to="/"
          className="text-4xl font-black italic tracking-tighter hover:text-[#004aad] transition-colors"
        >
          U<span className="text-[#004aad]">#</span>
        </Link>

        <div className="hidden lg:flex gap-12 text-[11px] font-black uppercase tracking-[0.6em] text-zinc-400 italic">
          <Link
            to="/"
            className={`hover:text-[#004aad] relative group ${
              location.pathname === "/" ? (isDarkMode ? "text-white" : "text-black") : ""
            }`}
          >
            Archive
            <span
              className={`absolute -bottom-2 left-0 h-1 bg-[#004aad] transition-all duration-500 ${
                location.pathname === "/" ? "w-full" : "w-0 group-hover:w-1/2"
              }`}
            />
          </Link>

          <Link
            to="/about"
            className={`hover:text-[#004aad] relative group ${
              location.pathname === "/about" ? (isDarkMode ? "text-white" : "text-black") : ""
            }`}
          >
            About
            <span
              className={`absolute -bottom-2 left-0 h-1 bg-[#004aad] transition-all duration-500 ${
                location.pathname === "/about" ? "w-full" : "w-0 group-hover:w-1/2"
              }`}
            />
          </Link>

          <Link
            to="/mylibrary"
            className={`hover:text-[#004aad] relative group ${
              location.pathname === "/mylibrary" ? (isDarkMode ? "text-white" : "text-black") : ""
            }`}
          >
            My U#
            <span
              className={`absolute -bottom-2 left-0 h-1 bg-[#004aad] transition-all duration-500 ${
                location.pathname === "/mylibrary" ? "w-full" : "w-0 group-hover:w-1/2"
              }`}
            />
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className={`hover:text-[#004aad] relative group ${
                location.pathname === "/admin" ? (isDarkMode ? "text-white" : "text-black") : ""
              }`}
            >
              Admin
              <span
                className={`absolute -bottom-2 left-0 h-1 bg-[#004aad] transition-all duration-500 ${
                  location.pathname === "/admin" ? "w-full" : "w-0 group-hover:w-1/2"
                }`}
              />
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-6">
        {canWrite && (
          <Link
            to="/write"
            className={`p-4 rounded-2xl hover:bg-[#004aad]/10 transition-all ${
              location.pathname === "/write"
                ? "text-[#004aad] bg-[#004aad]/5"
                : "text-zinc-400 hover:text-[#004aad]"
            }`}
            title="Write Article"
          >
            <Edit3 size={24} />
          </Link>
        )}

        <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />

        {user ? (
          <button
            onClick={onLogout}
            aria-label="로그아웃"
            className="flex items-center gap-2 p-2 rounded-xl text-zinc-400 hover:text-red-500 transition-all"
            type="button"
          >
            <LogOut size={20} />
          </button>
        ) : (
          <button
            onClick={onLogin}
            className="text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-lg hover:bg-[#004aad] hover:text-white transition-all"
            type="button"
          >
            Login
          </button>
        )}
        <button
          type="button"
          className="lg:hidden h-11 w-11 inline-flex items-center justify-center text-[var(--uf-text)]"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          title={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setOpenPath(menuOpen ? null : location.pathname)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {menuOpen && (
        <div id="mobile-navigation" className="lg:hidden absolute top-full left-0 right-0 border-b border-[var(--uf-border)] bg-[var(--uf-surface)] px-6 py-3" onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpenPath(null);
            document.querySelector('[aria-controls="mobile-navigation"]')?.focus();
          }
        }}>
          {[{ to: "/", label: "Archive" }, { to: "/about", label: "About" }, { to: "/mylibrary", label: "My U#" }, ...(canWrite ? [{ to: "/write", label: "글쓰기" }] : []), ...(isAdmin ? [{ to: "/admin", label: "관리" }] : [])].map((item) => (
            <Link key={item.to} to={item.to} className="flex items-center min-h-11 text-sm font-bold" aria-current={location.pathname === item.to ? "page" : undefined} onClick={() => setOpenPath(null)}>{item.label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
};

const GlobalFooter = () => {
  const { config } = useNetworkConfig();
  const links = getSiteLinks(config);
  return (
  <footer className="bg-white dark:bg-zinc-950 py-40 px-6 relative transition-colors border-t border-zinc-100 dark:border-zinc-900 font-black italic uppercase tracking-[0.4em] text-[11px]">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-24 text-center md:text-left pt-20">
      <div className="space-y-6">
        <p className="text-[#004aad] tracking-[1.2em]">/ CONTACT</p>
        <div className="space-y-3 opacity-50 dark:text-white">
          <p>서울특별시 종로구 인사동4길 17, 108호</p>
          <p>0502-1322-8906</p>
        </div>
      </div>

      <div className="space-y-6">
        <p className="text-[#004aad] tracking-[1.2em]">/ INFO</p>
        <div className="space-y-3 opacity-50 dark:text-white">
          <p>Representative: Kim Jae Woo</p>
          <p>Business No: 668-27-02010</p>
          <p>Mail Order: 2026-서울종로-0250</p>
        </div>
      </div>

      {(links.terms || links.privacy) && <div className="space-y-6">
        <p className="text-[#004aad] tracking-[1.2em]">/ LEGAL</p>
        <div className="space-y-3 flex flex-col gap-2 opacity-50 dark:text-white">
          {links.terms && <a href={links.terms} className="hover:text-[#004aad]" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>}
          {links.privacy && <a href={links.privacy} className="hover:text-[#004aad]" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>}
        </div>
      </div>}
    </div>

    <div className="mt-40 text-center opacity-30 text-[9px] tracking-[1.2em] dark:text-white italic uppercase">
      © UNFRAME MAG · Breaking frames, Building resonance.
    </div>
  </footer>
  );
};

// ----------------------------------------------------------------------------
// Router Helpers
// ----------------------------------------------------------------------------
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Some browsers return a Promise from scrollTo; effects must not return it.
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function DebugLayer({ children }) {
  const location = useLocation();
  const debugEnabled = useMobileDebugEnabled();
  const isMobile = useIsMobileViewport();
  const enabled = debugEnabled && isMobile;

  return (
    <>
      {enabled && <MobileDebugRuntimeOverlay enabled={enabled} />}
      <ErrorBoundary enabled={enabled} pathname={location.pathname}>
        {children}
      </ErrorBoundary>
    </>
  );
}

const RequireRole = ({ user, role, allow = [], loading = false, children }) => {
  if (loading) return <RouteLoading label="Checking access..." />;
  if (!user) return <Navigate to="/" replace />;
  if (!allow.includes(role)) return <Navigate to="/" replace />;
  return children;
};

const RouteLoading = ({ label = "Loading U#..." }) => (
  <div className="min-h-[70vh] flex items-center justify-center px-6 text-center text-[var(--uf-muted)] font-black italic tracking-widest uppercase">
    {label}
  </div>
);

const NotFound = () => (
  <div className="py-40 px-6 text-center">
    <h1 className="text-4xl font-black italic tracking-tighter mb-4">404</h1>
    <p className="text-[var(--uf-muted)] italic">Page not found.</p>
    <div className="mt-10">
      <Link
        to="/"
        className="text-[#004aad] font-black italic underline underline-offset-8"
      >
        Go Home
      </Link>
    </div>
  </div>
);

// ----------------------------------------------------------------------------
// App
// ----------------------------------------------------------------------------
function AppShell() {
  const { resolvedTheme, isDarkMode, toggleTheme } = useTheme();

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState("");
  const loginPending = useRef(false);
  const [toast, setToast] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const onToast = useCallback((message) => setToast({ message: String(message), at: Date.now() }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const notify = () => setUpdateAvailable(true);
    window.addEventListener("uf:update-available", notify);
    return () => window.removeEventListener("uf:update-available", notify);
  }, []);

  const [role, setRole] = useState("user");
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthLoading(false);
      if (u) {
        setRoleLoading(true);
      } else {
        setRole("user");
        setRoleLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getRedirectResult(auth).catch((e) => {
      console.error("[App] google redirect login error:", e);
      setLoginError("구글 로그인에 실패했어요. 일반 브라우저에서 다시 시도해 주세요.");
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const ref = doc(db, "users", user.uid);
    let active = true;

    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (!active) return;
        try {
        const email = user.email || "";
        const emailIsAdmin = isAdminEmail(email);

        if (!snap.exists()) {
          const nickname = safeNicknameFromDisplayName(user.displayName);
          const initialRole = "user";

          await runTransaction(db, async (transaction) => {
            const existing = await transaction.get(ref);
            if (existing.exists()) return;
            transaction.set(ref, {
            uid: user.uid,
            email: email || null,
            photoURL: user.photoURL || null,
            displayName: nickname,
            name: nickname,
            nickname,
            nicknameChanged: false,
            role: initialRole,
            xp: 0,
            level: 1,
            tier: "ROOKIE",
            tierLabel: "Rookie",
            tierColor: "#9CA3AF",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            });
          });

          if (!active) return;
          setRole(initialRole);
          setRoleLoading(false);
          return;
        }

        const data = snap.data() || {};
        const currentRole = String(data.role || "user");

        if (!("role" in data)) {
          const nextRole = emailIsAdmin ? "admin" : "user";
          await setDoc(ref, { role: nextRole, updatedAt: serverTimestamp() }, { merge: true });
          if (!active) return;
          setRole(nextRole);
          setRoleLoading(false);
          return;
        }

        if (emailIsAdmin && currentRole !== "admin") {
          await setDoc(ref, { role: "admin", updatedAt: serverTimestamp() }, { merge: true });
          if (!active) return;
          setRole("admin");
          setRoleLoading(false);
          return;
        }

        setRole(currentRole);
        setRoleLoading(false);
        } catch (error) {
          if (!active) return;
          console.error("[App] profile initialization failed:", error);
          reportClientError(error, { source: "profile" });
          setRole("user");
          setRoleLoading(false);
          onToast("프로필을 불러오지 못했어요. 잠시 후 다시 로그인해 주세요.");
        }
      },
      (e) => {
        console.error("[App] role snapshot error:", e);
        setRole("user");
        setRoleLoading(false);
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, [user, onToast]);

  const isAdmin = useMemo(() => {
    if (!user?.email) return false;
    return isAdminEmail(user.email);
  }, [user?.email]);

  const effectiveRole = isAdmin ? "admin" : role === "editor" ? "editor" : "user";

  const handleLogin = async () => {
    if (loginPending.current) return;
    loginPending.current = true;
    setLoginError("");
    try {
      googleProvider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("[App] google popup login error:", e);
      const code = String(e?.code || "");
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      const shouldUseRedirect =
        code === "auth/popup-blocked" ||
        code === "auth/web-storage-unsupported" ||
        code === "auth/operation-not-supported-in-this-environment";

      reportClientError(e, { source: "auth" });
      if (shouldUseRedirect && import.meta.env.VITE_FIREBASE_AUTH_PROXY === "true") {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectError) {
          console.error("[App] google redirect login error:", redirectError);
          setLoginError("구글 로그인에 실패했어요. 일반 브라우저에서 다시 시도해 주세요.");
        }
      } else {
        setLoginError("구글 로그인에 실패했어요. 일반 브라우저에서 다시 시도해 주세요.");
      }
    } finally {
      loginPending.current = false;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <ScrollToTop />

      <DebugLayer>
        <div
          className="min-h-screen font-sans transition-all duration-700 selection:bg-[#004aad] selection:text-white bg-[var(--uf-bg)] text-[var(--uf-text)]"
          data-theme={resolvedTheme}
        >
          <div
            className={`fixed inset-0 pointer-events-none transition-opacity duration-700 ${
              isDarkMode ? "opacity-[0.01]" : "opacity-[0.03]"
            }`}
            style={{
              backgroundImage:
                "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />

          <Navbar
            toggleTheme={toggleTheme}
            isDarkMode={isDarkMode}
            user={user}
            role={effectiveRole}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />

          <InstallPrompt />
          {updateAvailable && (
            <div role="status" className="relative flex flex-wrap items-center justify-between gap-3 bg-[var(--uf-surface-strong)] px-6 py-3 text-sm">
              <p>새 버전이 준비되었습니다. 작성 중인 내용을 저장한 후 업데이트해 주세요.</p>
              <button type="button" className="min-h-11 px-3 underline" onClick={() => window.dispatchEvent(new Event("uf:apply-update"))}>업데이트</button>
            </div>
          )}

          {loginError && (
            <div role="alert" className="relative px-6 py-3 text-sm text-red-700 bg-red-50 dark:text-red-200 dark:bg-red-950">
              {loginError}
              <a href={window.location.origin + window.location.pathname} target="_blank" rel="noopener noreferrer" className="ml-3 underline">브라우저에서 열기</a>
            </div>
          )}

          <main className="relative">
            <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route
                path="/"
                element={
                  <HomePage
                    isDarkMode={isDarkMode}
                    user={user}
                    authLoading={authLoading}
                    onToast={onToast}
                  />
                }
              />
              <Route
                path="/about"
                element={<AboutPage isDarkMode={isDarkMode} user={user} />}
              />
              <Route
                path="/mylibrary"
                element={
                  <MyPage
                    isDarkMode={isDarkMode}
                    user={user}
                    authLoading={authLoading}
                    onToast={onToast}
                  />
                }
              />
              <Route
                path="/article/:id"
                element={<ViewPage isDarkMode={isDarkMode} user={user} onLogin={handleLogin} onToast={onToast} />}
              />

              <Route
                path="/write"
                element={
                  <RequireRole user={user} role={effectiveRole} allow={["admin", "editor"]} loading={authLoading || roleLoading}>
                    <EditorPage
                      isDarkMode={isDarkMode}
                      user={user}
                      role={effectiveRole}
                      onToast={onToast}
                    />
                  </RequireRole>
                }
              />

              <Route
                path="/edit/:articleId"
                element={
                  <RequireRole user={user} role={effectiveRole} allow={["admin", "editor"]} loading={authLoading || roleLoading}>
                    <EditorPage
                      isDarkMode={isDarkMode}
                      user={user}
                      role={effectiveRole}
                      onToast={onToast}
                    />
                  </RequireRole>
                }
              />

              <Route
                path="/admin"
                element={
                  <RequireRole user={user} role={effectiveRole} allow={["admin"]} loading={authLoading || roleLoading}>
                    <AdminPage
                      user={user}
                      isDarkMode={isDarkMode}
                      role={effectiveRole}
                      onToast={onToast}
                    />
                  </RequireRole>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </main>

          <GlobalFooter />
          {toast && (
            <div role="status" aria-live="polite" className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-[300] flex items-center gap-3 rounded-lg bg-[var(--uf-text)] text-[var(--uf-bg)] p-4 shadow-lg">
              <p className="min-w-0 flex-1 text-sm break-words">{toast.message}</p>
              <button type="button" aria-label="알림 닫기" title="알림 닫기" className="h-11 w-11 shrink-0 flex items-center justify-center" onClick={() => setToast(null)}><X size={18} /></button>
            </div>
          )}
        </div>
      </DebugLayer>
    </>
  );
}

const router = createBrowserRouter([{ path: "*", element: <AppShell /> }]);

export default function App() {
  return <RouterProvider router={router} />;
}
