import { useEffect } from "react";

// 페이지를 떠나거나 숨겨질 때 현재 초안을 기기 복구본으로 보관합니다.
export function useRecoveryCapture({ isDirty, captureRecovery, currentMetaRef }) {
  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeLeaving = (event) => {
      captureRecovery(currentMetaRef.current);
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty, captureRecovery, currentMetaRef]);

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
  }, [captureRecovery, currentMetaRef]);
}
