import { useLayoutEffect } from "react";

// 값이 바뀔 때마다 textarea 높이를 내용에 맞춥니다.
export function useAutoResizeTextarea(ref, value) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}
