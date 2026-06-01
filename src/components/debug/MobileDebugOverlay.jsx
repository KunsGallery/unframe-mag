import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

function describeError(error) {
  if (!error) {
    return {
      title: "Unknown error",
      message: "No error details were provided.",
      stack: "",
    };
  }

  if (typeof error === "string") {
    return {
      title: "Unhandled rejection",
      message: error,
      stack: "",
    };
  }

  const title = error.name || "Error";
  const message = error.message || String(error);
  const stack = typeof error.stack === "string" ? error.stack : "";

  return { title, message, stack };
}

export function MobileDebugOverlay({
  title = "Debug overlay",
  message,
  stack = "",
  pathname = "",
  detail = "",
  onClose,
}) {
  const lines = useMemo(() => {
    if (!stack) return [];
    return String(stack)
      .split("\n")
      .filter(Boolean)
      .slice(0, 8);
  }, [stack]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div className="absolute inset-x-4 bottom-4 md:inset-x-auto md:bottom-6 md:right-6 md:w-[min(92vw,32rem)] pointer-events-auto">
        <div className="rounded-2xl border border-red-500/30 bg-zinc-950/95 text-white shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-red-400 italic">
                <AlertTriangle size={14} />
                <span>Debug</span>
              </div>
              <div className="mt-2 text-sm font-black italic leading-tight break-words">
                {title}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 shrink-0 rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 transition flex items-center justify-center"
              aria-label="Close debug overlay"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[52vh] overflow-y-auto px-4 py-4 space-y-3">
            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                Path
              </div>
              <div className="mt-1 text-[12px] break-all text-zinc-100">{pathname || "/"}</div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
              <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                Message
              </div>
              <div className="mt-1 text-[13px] leading-6 break-words text-zinc-100">
                {message || "No message available."}
              </div>
            </div>

            {!!detail && (
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  Detail
                </div>
                <div className="mt-1 text-[12px] leading-6 break-words text-zinc-200">
                  {detail}
                </div>
              </div>
            )}

            {lines.length > 0 && (
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
                  Stack
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-5 text-zinc-300">
                  {lines.join("\n")}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileDebugRuntimeOverlay({ enabled = false }) {
  const [record, setRecord] = useState(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const captureError = (event) => {
      if (!(event instanceof ErrorEvent)) return;

      const error = event.error;
      const title = error?.name || "Window error";
      const message =
        event.message ||
        error?.message ||
        `${event.filename || "unknown"}:${event.lineno || 0}:${event.colno || 0}`;
      const stack = error?.stack || "";
      const detail = [event.filename, event.lineno, event.colno]
        .filter(Boolean)
        .join(":");

      setRecord({
        title,
        message,
        stack,
        detail,
        pathname: window.location.pathname,
      });
    };

    const captureRejection = (event) => {
      const reason = event.reason;
      const normalized = describeError(reason);
      const detail =
        typeof reason === "object" && reason
          ? reason.code || reason.name || reason.type || ""
          : "";

      setRecord({
        title: "Unhandled rejection",
        message: normalized.message,
        stack: normalized.stack,
        detail: detail ? String(detail) : "",
        pathname: window.location.pathname,
      });
    };

    window.addEventListener("error", captureError, true);
    window.addEventListener("unhandledrejection", captureRejection);

    return () => {
      window.removeEventListener("error", captureError, true);
      window.removeEventListener("unhandledrejection", captureRejection);
    };
  }, [enabled]);

  if (!enabled || !record) return null;

  return (
    <MobileDebugOverlay
      title={record.title}
      message={record.message}
      stack={record.stack}
      detail={record.detail}
      pathname={record.pathname}
      onClose={() => setRecord(null)}
    />
  );
}
