// src/utils/image.js
export async function fileToDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function compressToFile(file, {
  targetBytes,
  maxWidth,
  maxHeight,
  mime = "image/jpeg",
}){
  const bitmap = await createImageBitmap(file);
  let w = bitmap.width;
  let h = bitmap.height;

  const ratio = Math.min(maxWidth / w, maxHeight / h, 1);
  w = Math.round(w * ratio);
  h = Math.round(h * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // jpeg 변환 대비 흰 배경
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);

  let quality = 0.86;
  let blob = await new Promise((res) => canvas.toBlob(res, mime, quality));
  if (!blob) return file;

  let guard = 0;
  while (blob.size > targetBytes && guard < 10) {
    quality -= 0.10;
    if (quality < 0.35) {
      // 품질 더 내리기 전에 픽셀도 줄이기
      const shrink = 0.85;
      canvas.width = Math.round(canvas.width * shrink);
      canvas.height = Math.round(canvas.height * shrink);
      const ctx2 = canvas.getContext("2d");
      ctx2.fillStyle = "#ffffff";
      ctx2.fillRect(0, 0, canvas.width, canvas.height);
      ctx2.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      quality = 0.75;
    }
    blob = await new Promise((res) => canvas.toBlob(res, mime, quality));
    if (!blob) break;
    guard++;
  }

  const outName = file.name.replace(/\.(png|jpg|jpeg|webp)$/i, "") + ".jpg";
  return new File([blob], outName, { type: mime });
}

export async function makeCoverVariants(file) {
  // full: 3MB 목표 / 2400px
  const full = await compressToFile(file, {
    targetBytes: 3 * 1024 * 1024,
    maxWidth: 2400,
    maxHeight: 2400,
  });

  // thumb: 350KB 목표 / 900px
  const thumb = await compressToFile(file, {
    targetBytes: 350 * 1024,
    maxWidth: 900,
    maxHeight: 900,
  });

  return { full, thumb };
}
