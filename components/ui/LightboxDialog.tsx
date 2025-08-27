"use client";

import Image from "next/image";
import * as React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
  title?: string;
  sourceUrl?: string; // already proxied
};

export default function LightboxDialog({ open, onClose, src, alt, title, sourceUrl }: Props) {
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
      className="m-0 w-[96vw] max-w-none rounded-xl bg-transparent p-0 backdrop:bg-black/70"
      onClose={onClose}
      onClick={(e) => {
        // click outside content closes
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="mx-auto flex w-[96vw] max-w-5xl flex-col gap-2 rounded-xl bg-white p-2 shadow-xl">
        <div className="relative h-[78vh] w-full overflow-hidden rounded-lg">
          <Image src={src} alt={alt || "image"} fill className="object-contain" sizes="90vw" priority />
        </div>

        <div className="flex items-center justify-between px-1 pb-1 text-xs text-gray-600">
          <div className="truncate">{title}</div>
          <div className="flex items-center gap-3">
            {sourceUrl && (
              <a className="underline" href={sourceUrl} target="_blank" rel="noreferrer">
                open source
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-2 py-1 hover:bg-gray-50"
              aria-label="Close image"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
