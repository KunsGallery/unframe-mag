// src/hooks/useUploadImage.js
import { useCallback, useRef, useState } from "react";
import { uploadImageWithProgress } from "../lib/uploadWithProgress";

/**
 * variant:
 * - "inline": 본문 이미지
 * - "parallax"
 * - "sticky"
 * - "cover": cover + coverMedium까지 생성(옵션)
 *
 * coverMedium은 Cloudinary transform URL을 쓸 수 있을 때 자동 생성(가능하면)
 * (imgbb는 transform이 없어서 coverMedium = cover로 fallback)
 */
function tryMakeCloudinaryTransformed(
  url,
  { width = 1600, quality = "auto", format = "auto" } = {}
) {
  if (!url.includes("/image/upload/")) return null;
  return url.replace(
    "/image/upload/",
    `/image/upload/f_${format},q_${quality},w_${width},c_fill/`
  );
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
      const url = await uploadImageWithProgress(file, {
        onProgress: (pct) => {
          if (runIdRef.current !== runId) return;
          setProgress(pct);
        },
      });

      if (variant === "cover") {
        const cover = url;
        const coverMedium = tryMakeCloudinaryTransformed(url, { width: 1600 }) || url;
        return { url: cover, coverMedium };
      }

      return { url };
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