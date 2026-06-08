import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function ImageLightbox({ image, onClose }) {
  useEffect(() => {
    if (!image) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [image, onClose]);

  if (!image?.src) return null;

  const caption = image.caption || image.alt || "";

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center px-4 py-6 sm:p-8 cursor-zoom-out"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <button
        type="button"
        className="fixed right-4 top-4 sm:right-6 sm:top-6 z-[201] h-11 w-11 rounded-full bg-white/10 text-white backdrop-blur flex items-center justify-center hover:bg-white/20 transition"
        onClick={(event) => {
          event.stopPropagation();
          onClose?.();
        }}
        aria-label="Close image preview"
      >
        <X size={24} />
      </button>

      <figure
        className="max-w-[min(96vw,1600px)] max-h-[92vh] flex flex-col items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={image.src}
          alt={image.alt || caption || ""}
          className="max-w-[min(96vw,1600px)] max-h-[86vh] object-contain rounded-md shadow-2xl"
          decoding="async"
        />
        {caption ? (
          <figcaption className="mt-4 max-w-[min(92vw,900px)] text-center text-xs sm:text-sm leading-6 text-white/70">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
}
