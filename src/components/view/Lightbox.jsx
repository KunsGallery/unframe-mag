import React from "react";
import { X } from "lucide-react";

export default function Lightbox({ lightbox, onClose }) {
  if (!lightbox) return null;

  return (
    <div className="fixed inset-0 z-200 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-10 cursor-zoom-out" onClick={onClose}>
      <button className="absolute top-10 right-10 text-white opacity-50 hover:opacity-100 hover:rotate-90 transition-all">
        <X size={32} />
      </button>
      <img src={lightbox.src} className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-300" alt="" />
      {lightbox.caption && <p className="mt-10 text-white/60 font-medium italic tracking-widest text-sm">{lightbox.caption}</p>}
    </div>
  );
}