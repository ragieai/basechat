"use client";

import { X } from "lucide-react";
import Image from "next/image";
import * as React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
  title?: string;
};

export default function LightboxDialog({ open, onClose, src, alt, title }: Props) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="backdrop:bg-black/70 bg-transparent p-0 m-0 max-w-none max-h-none w-screen h-screen"
      onClose={onClose}
      onClick={(e) => {
        // click outside content closes
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative mx-auto flex w-[90vw] max-w-4xl flex-col gap-2 rounded-xl bg-white p-4 shadow-xl">
          {/* Close button in top right */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-10 rounded-full bg-black/20 p-2 hover:bg-black/30 transition-colors"
            aria-label="Close image"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <div className="relative h-[70vh] w-full overflow-hidden rounded-lg">
            <Image src={src} alt={alt || "image"} fill className="object-contain" sizes="90vw" priority />
          </div>

          {title && (
            <div className="px-2 pb-1 text-center text-sm text-gray-600">
              <div className="truncate">{title}</div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
