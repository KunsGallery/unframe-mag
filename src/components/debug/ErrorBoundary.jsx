import React from "react";
import { MobileDebugOverlay } from "./MobileDebugOverlay";
import { getRuntimeDiagnostics, reportClientError } from "../../lib/runtimeDiagnostics";
import { isAppShellError, recoverAppShell } from "../../lib/appShellRecovery";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary]", error, errorInfo);
    reportClientError(error, { source: "render" });
    if (isAppShellError(error)) void recoverAppShell({ reason: "render-chunk-load" });
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.pathname !== this.props.pathname) {
      this.setState({ error: null, errorInfo: null });
    }
  }

  handleClose = () => {
    this.setState({ error: null, errorInfo: null });
  };

  handleReload = () => {
    if (isAppShellError(this.state.error)) void recoverAppShell({ manual: true });
    else window.location.reload();
  };

  handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(getRuntimeDiagnostics(), null, 2));
      this.setState({ copied: true });
    } catch {
      this.setState({ copied: false });
    }
  };

  render() {
    const { children, enabled = false, pathname = "" } = this.props;
    const { error, errorInfo } = this.state;

    if (error) {
      if (!enabled) {
        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950 text-white px-6">
            <div className="max-w-md rounded-2xl border border-red-500/30 bg-zinc-900 p-6 shadow-2xl">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400 italic">
                Error
              </div>
              <div className="mt-3 text-lg font-black italic">Something went wrong.</div>
              <div className="mt-3 text-sm text-zinc-300 break-words">
                {error.message || String(error)}
              </div>
              <button
                type="button"
                onClick={this.handleReload}
                className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-950"
              >
                Reload
              </button>
              <button type="button" className="mt-3 min-h-11 w-full text-sm underline" onClick={this.handleCopy}>
                {this.state.copied ? "오류 정보를 복사했어요" : "오류 정보 복사"}
              </button>
            </div>
          </div>
        );
      }

      return (
        <MobileDebugOverlay
          title={error.name || "Render error"}
          message={error.message || String(error)}
          stack={error.stack || ""}
          detail={errorInfo?.componentStack || ""}
          pathname={pathname || window.location.pathname}
          onClose={this.handleClose}
        />
      );
    }

    return children;
  }
}
