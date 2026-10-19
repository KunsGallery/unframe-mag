import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { getOptimizedImageUrl, getImageSrcSet } from "../../lib/imageUrl";
import ImageDeliveryLayer from "./ImageDeliveryLayer";

export default function ImageLightbox({ image, onClose }) {
  const dialogRef = useRef(null);
  const [imageRoot, setImageRoot] = useState(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const open = !!image?.src;
  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const background = new Map();
    const makeInert = () => {
      Array.from(document.body.children).forEach((element) => {
        if (element === dialog || background.has(element)) return;
        background.set(element, element.inert);
        element.inert = true;
      });
    };
    makeInert();
    const observer = new MutationObserver(makeInert);
    observer.observe(document.body, { childList: true });
    const overflow = document.body.style.overflow;
    const padding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) {
      document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    }
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => !element.hidden && element.getClientRects().length);
    const focusFirst = () => (focusable()[0] || dialog).focus({ preventScroll: true });
    focusFirst();
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current?.();
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0] || dialog;
      const last = elements.at(-1) || dialog;
      if (!elements.length || !dialog.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    };
    const onFocus = (event) => {
      if (!dialog.contains(event.target)) focusFirst();
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocus);
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocus);
      background.forEach((inert, element) => { element.inert = inert; });
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = padding;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  if (!image?.src) return null;

  const caption = image.caption || image.alt || "";

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
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
        ref={setImageRoot}
        className="relative max-w-[min(96vw,1600px)] max-h-[92vh] flex flex-col items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={getOptimizedImageUrl(image.src, { width: 2400 })}
          srcSet={getImageSrcSet(image.src, [800, 1600, 2400])}
          sizes="96vw"
          data-original-src={image.src}
          alt={image.alt || caption || ""}
          className="max-w-[min(96vw,1600px)] max-h-[86vh] object-contain rounded-md shadow-2xl"
          decoding="async"
        />
        <ImageDeliveryLayer root={imageRoot} revision={image.src} />
        {caption ? (
          <figcaption className="mt-4 max-w-[min(92vw,900px)] text-center text-xs sm:text-sm leading-6 text-white/70">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    </div>,
    document.body
  );
}
