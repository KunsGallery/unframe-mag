// src/hooks/useUploadImage.js
import { useCallback, useRef, useState } from "react";
import { uploadImageWithProgress } from "../lib/uploadWithProgress";
import { getOptimizedImageUrl } from "../lib/imageUrl";

/**
 * variant:
 * - "inline": 본문 이미지
 * - "parallax"
 * - "sticky"
 * - "cover": cover + coverMedium까지 생성(옵션)
 *
 * coverMedium은 원본을 보존한 Cloudinary 전송용 URL입니다.
 */
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
        const coverMedium = getOptimizedImageUrl(url, { width: 1600 });
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
