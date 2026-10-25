// src/lib/webVitals.js
import { anonymousRoute } from "./runtimeDiagnostics";

// A fifth of visits is enough to see trends without logging every page view.
const SAMPLE_RATE = 0.2;

export function vitalsPayload(metric, { pathname, isMobile, build }) {
  return {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    route: anonymousRoute(pathname),
    device: isMobile ? "mobile" : "desktop",
    build,
  };
}

export async function startWebVitals({ random = Math.random } = {}) {
  if (!import.meta.env.PROD || random() >= SAMPLE_RATE) return;
  const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import("web-vitals");
  const send = (metric) => {
    const body = JSON.stringify(vitalsPayload(metric, {
      pathname: window.location.pathname,
      isMobile: window.matchMedia?.("(max-width: 768px)").matches,
      build: import.meta.env.VITE_BUILD_VERSION || "local",
    }));
    fetch("/api/client-vitals", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  };
  [onCLS, onFCP, onINP, onLCP, onTTFB].forEach((listen) => listen(send));
}
