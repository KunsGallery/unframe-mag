import React, { useEffect, useMemo, useState } from "react";

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isDesktop() {
  return window.innerWidth >= 1024;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("uf_pwa_prompt_dismissed") === "1";
    } catch {
      return false;
    }
  });
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const installed = useMemo(() => {
    if (typeof window === "undefined") return false;
    return isInStandaloneMode();
  }, []);

  if (installed || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem("uf_pwa_prompt_dismissed", "1");
    setDismissed(true);
    setShowIOSGuide(false);
  };

  const install = async () => {
    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;

    if (result?.outcome === "accepted") {
      setDeferredPrompt(null);
      dismiss();
    }
  };

  const desktopMode = typeof window !== "undefined" ? isDesktop() : false;

  return (
    <>
      <div
        className={[
          "fixed z-999 rounded-2xl border shadow-2xl backdrop-blur-xl",
          "bg-white/95 dark:bg-zinc-950/95 border-zinc-200 dark:border-zinc-800",
          desktopMode
            ? "bottom-6 right-6 w-[360px] p-5"
            : "left-4 right-4 bottom-4 p-4",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.35em] uppercase font-black opacity-50">
              Install App
            </div>
            <div className="mt-2 text-base font-black tracking-tight">
              홈 화면에 추가하고 앱처럼 실행하기
            </div>
            <div className="mt-2 text-sm opacity-70 leading-6">
              {desktopMode
                ? "데스크탑에서 앱처럼 열고 빠르게 접근할 수 있어요."
                : "홈 화면에 추가하면 앱처럼 전체 화면으로 바로 실행돼요."}
            </div>
          </div>

          <button
            onClick={dismiss}
            className="shrink-0 text-xs font-black opacity-50 hover:opacity-100"
            type="button"
          >
            닫기
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={install}
            className="px-4 py-3 rounded-xl bg-[#004aad] text-white text-sm font-black"
            type="button"
          >
            {isIOS() ? "설치 방법 보기" : desktopMode ? "앱 설치" : "홈 화면에 추가"}
          </button>

          <button
            onClick={dismiss}
            className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-black"
            type="button"
          >
            나중에
          </button>
        </div>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-1000 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6">
            <div className="text-[10px] tracking-[0.35em] uppercase font-black opacity-50">
              iPhone / iPad
            </div>
            <div className="mt-2 text-xl font-black tracking-tight">
              홈 화면에 추가하는 방법
            </div>

            <div className="mt-5 space-y-3 text-sm leading-6 opacity-80">
              <div>1. 하단 또는 상단의 <b>공유</b> 버튼을 누르세요.</div>
              <div>2. <b>홈 화면에 추가</b>를 선택하세요.</div>
              <div>3. 이름을 확인하고 <b>추가</b>를 누르세요.</div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={dismiss}
                className="px-4 py-3 rounded-xl bg-[#004aad] text-white text-sm font-black"
                type="button"
              >
                확인
              </button>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-black"
                type="button"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
