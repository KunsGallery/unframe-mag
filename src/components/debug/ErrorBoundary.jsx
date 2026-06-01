import React from "react";
import { MobileDebugOverlay } from "./MobileDebugOverlay";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleClose = () => {
    this.setState({ error: null, errorInfo: null });
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

