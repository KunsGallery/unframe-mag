import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Sun, Moon, Edit3, LogOut } from "lucide-react";

// Firebase
import { auth, googleProvider } from "./firebase/config";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// ✅ Pages (모두 src/pages/ 에 존재한다고 했으니 여기서 import)
import HomePage from "./Pages/HomePage";
import AboutPage from "./Pages/AboutPage";
import EditorPage from "./Pages/EditorPage";
import MyPage from "./Pages/MyPage";
import ViewPage from "./Pages/ViewPage";
import AdminPage from "./Pages/AdminPage";

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------
const ADMIN_EMAILS = ["gallerykuns@gmail.com", "cybog2004@gmail.com", "sylove887@gmail.com"];

// ----------------------------------------------------------------------------
// Shared Components
// ----------------------------------------------------------------------------
const Navbar = ({ toggleTheme, isDarkMode, user, onLogin, onLogout }) => {
  const location = useLocation();
  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email);

  return (
    <nav
      className={`h-[80px] border-b px-6 md:px-12 flex justify-between items-center sticky top-0 z-100 transition-all duration-500 ${
        isDarkMode ? "bg-black/90 border-zinc-900" : "bg-white/90 border-zinc-50"
      } backdrop-blur-3xl shadow-sm`}
    >
      <div className="flex items-center gap-20">
        <Link to="/" className="text-4xl font-black italic tracking-tighter hover:text-[#004aad] transition-colors">
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

          {/* ✅ 네가 말한 마이페이지 경로: /mylibrary */}
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
        </div>
      </div>

      <div className="flex items-center gap-6">
        {isAdmin && (
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

        <button
          onClick={toggleTheme}
          className="w-14 h-14 rounded-2xl flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-[#004aad] transition-all shadow-inner group"
        >
          {isDarkMode ? (
            <Sun size={24} className="group-hover:rotate-90 transition-all duration-700" />
          ) : (
            <Moon size={24} className="group-hover:-rotate-12 transition-all duration-700" />
          )}
        </button>

        {user ? (
          <button onClick={onLogout} className="flex items-center gap-2 p-2 rounded-xl text-zinc-400 hover:text-red-500 transition-all">
            <LogOut size={20} />
          </button>
        ) : (
          <button
            onClick={onLogin}
            className="text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-lg hover:bg-[#004aad] hover:text-white transition-all"
          >
            Login
          </button>
        )}
      </div>
    </nav>
  );
};

const GlobalFooter = () => (
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
      <div className="space-y-6">
        <p className="text-[#004aad] tracking-[1.2em]">/ LEGAL</p>
        <div className="space-y-3 flex flex-col gap-2 opacity-50 dark:text-white">
          <a href="#" className="hover:text-[#004aad]">Terms of Service</a>
          <a href="#" className="hover:text-[#004aad]">Privacy Policy</a>
        </div>
      </div>
    </div>
    <div className="mt-40 text-center opacity-30 text-[9px] tracking-[1.2em] dark:text-white italic uppercase">
      © UNFRAME MAG · Breaking frames, Building resonance.
    </div>
  </footer>
);

// ----------------------------------------------------------------------------
// Router Helpers
// ----------------------------------------------------------------------------
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

const RequireAdmin = ({ user, isAdmin, children }) => {
  if (!user) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

const NotFound = () => (
  <div className="py-40 px-6 text-center">
    <h1 className="text-4xl font-black italic tracking-tighter mb-4">404</h1>
    <p className="opacity-60 italic">Page not found.</p>
    <div className="mt-10">
      <Link to="/" className="text-[#004aad] font-black italic underline underline-offset-8">
        Go Home
      </Link>
    </div>
  </div>
);

// ----------------------------------------------------------------------------
// App
// ----------------------------------------------------------------------------
export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTheme = () => setIsDarkMode((v) => !v);

  return (
    <Router>
      <ScrollToTop />
      <div
        className={`min-h-screen font-sans transition-all duration-700 selection:bg-[#004aad] selection:text-white ${
          isDarkMode ? "bg-black text-white dark" : "bg-white text-black"
        }`}
      >
        {/* Background Grid */}
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
          onLogin={handleLogin}
          onLogout={handleLogout}
        />

        <main className="relative">
          <Routes>
            {/* Home */}
            <Route path="/" element={<HomePage isDarkMode={isDarkMode} user={user} authLoading={authLoading} />} />

            {/* About */}
            <Route path="/about" element={<AboutPage isDarkMode={isDarkMode} user={user} />} />

            {/* MyPage */}
            <Route path="/mylibrary" element={<MyPage isDarkMode={isDarkMode} user={user} authLoading={authLoading} />} />

            {/* ViewPage */}
            <Route path="/article/:id" element={<ViewPage isDarkMode={isDarkMode} user={user} />} />

            {/* EditorPage (admin only) */}
            <Route
              path="/write"
              element={
                <RequireAdmin user={user} isAdmin={isAdmin}>
                  <EditorPage isDarkMode={isDarkMode} user={user} />
                </RequireAdmin>
              }
            />

            {/* AdminPage */}
            <Route path="/admin" element={<AdminPage user={user} isDarkMode={isDarkMode} />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <GlobalFooter />
      </div>
    </Router>
  );
}