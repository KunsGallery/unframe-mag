// src/hooks/useUploadImage.js
import { useCallback, useRef, useState } from "react";
import { uploadImageVariantsWithProgress } from "../lib/uploadWithProgress";

/**
 * variant:
 * - "inline": 본문 이미지
 * - "parallax"
 * - "sticky"
 * - "cover": cover + coverMedium 생성
 *
 * 정책:
 * - cover는 original + medium 함께 저장
 * - 본문/패럴랙스/스티키는 medium 우선 사용
 */
function tryMakeCloudinaryTransformed(url, { width = 1600, quality = "auto", format = "auto" } = {}) {
  if (!url || !url.includes("/image/upload/")) return null;
  return url.replace("/image/upload/", `/image/upload/f_${format},q_${quality},w_${width},c_fill/`);
}

export function useUploadImage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const runIdRef = useRef(0);

  const upload = useCallback(async (file, { variant = "inline" } = {}) => {
    setError("");
    setUploading(true);
    setProgress(0);
    const runId = ++runIdRef.current;

    try {
      const result = await uploadImageVariantsWithProgress(file, {
        onProgress: (pct) => {
          if (runIdRef.current !== runId) return;
          setProgress(pct);
        },
      });

      const originalUrl = result?.originalUrl || "";
      const mediumUrl =
        tryMakeCloudinaryTransformed(originalUrl, { width: 1600 }) ||
        result?.mediumUrl ||
        originalUrl;

      const thumbUrl = result?.thumbUrl || mediumUrl || originalUrl;

      if (variant === "cover") {
        return {
          url: originalUrl,
          coverMedium: mediumUrl || originalUrl,
          thumbUrl,
        };
      }

      return {
        url: mediumUrl || originalUrl,
        originalUrl,
        mediumUrl: mediumUrl || originalUrl,
        thumbUrl,
      };
    } catch (e) {
      console.error(e);
      setError(e?.message || "Upload failed");
      throw e;
    } finally {
      if (runIdRef.current === runId) {
        setUploading(false);
      }
    }
  }, []);

  return { upload, uploading, progress, error, setError };
}