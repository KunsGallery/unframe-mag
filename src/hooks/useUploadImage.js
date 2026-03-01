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
function tryMakeCloudinaryTransformed(url, { width = 1600, quality = "auto", format = "auto" } = {}) {
  // Cloudinary URL 패턴이 아니면 null
  // https://res.cloudinary.com/<cloud>/image/upload/<rest>
  if (!url.includes("/image/upload/")) return null;
  return url.replace("/image/upload/", `/image/upload/f_${format},q_${quality},w_${width},c_fill/`);
}

export function useUploadImage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  // 같은 파일을 연속 업로드할 때 state 꼬임 방지용
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

      // cover variant면 medium도 만들어줌(가능하면)
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
        // 100%에서 잠깐 유지해도 되고 바로 0으로 내려도 됨
        // setProgress(0);
      }
    }
  }, []);

  return { upload, uploading, progress, error, setError };
}