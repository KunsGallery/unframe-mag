import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const MOBILE_QUERY = "(max-width: 767px)";
const DEV_ENABLED = import.meta.env.DEV;

function readDebugFlag() {
  try {
    return localStorage.getItem("uf_debug") === "1";
  } catch {
    return false;
  }
}

function readDebugQuery(search) {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get("debug") ?? params.get("uf_debug");

    if (raw === "1" || raw === "0") {
      return raw;
    }
  } catch {
    // ignore malformed query strings
  }

  return null;
}

export function useMobileDebugEnabled() {
  const location = useLocation();
  const queryMode = readDebugQuery(location.search);

  const [enabled, setEnabled] = useState(() => {
    if (DEV_ENABLED) return true;
    if (queryMode === "1") return true;
    if (queryMode === "0") return false;
    return readDebugFlag();
  });

  useEffect(() => {
    if (queryMode === "1") {
      try {
        localStorage.setItem("uf_debug", "1");
      } catch {
        // ignore storage failures
      }
      setEnabled(true);
      return;
    }

    if (queryMode === "0") {
      try {
        localStorage.removeItem("uf_debug");
      } catch {
        // ignore storage failures
      }
      setEnabled(DEV_ENABLED || readDebugFlag());
      return;
    }

    setEnabled(DEV_ENABLED || readDebugFlag());
  }, [queryMode, location.search]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === "uf_debug") {
        setEnabled(DEV_ENABLED || readDebugFlag());
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return enabled;
}

export function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const media = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(media.matches);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  return isMobile;
}
