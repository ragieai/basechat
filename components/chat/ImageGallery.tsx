"use client";

import Image from "next/image";
import * as React from "react";

import LightboxDialog from "@/components/ui/LightboxDialog";
import { getRagieDocumentSourcePath } from "@/lib/paths";

export type ChatImage = {
  url: string;
  alt?: string;
  title?: string;
  sourceUrl?: string; // direct (may be upstream)
  documentId?: string; // to build proxied link
};

type Props = {
  images: ChatImage[];
  className?: string;
};

export default function ImageGallery({ images, className }: Props) {
  const [active, setActive] = React.useState<ChatImage | null>(null);

  if (!images?.length) return null;

  const unique = Array.from(new Map(images.map((i) => [i.url, i])).values());

  const toProxied = (img: ChatImage) =>
    img.documentId ? getRagieDocumentSourcePath(img.documentId) : img.sourceUrl || undefined;
  if (unique.length === 1) {
    const img = unique[0];
    const proxied = toProxied(img);
    return (
      <>
        <figure className={`rounded-xl border border-gray-200 bg-white p-2 shadow-sm ${className ?? ""}`}>
          <button
            type="button"
            onClick={() => setActive(img)}
            className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-lg cursor-zoom-in"
          >
            {/* Note: remotePatterns must allow api.ragie.ai */}
            <Image
              src={img.url}
              alt={img.alt || img.title || "Image"}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 700px"
              priority
            />
          </button>
          {img.title && <figcaption className="mt-2 text-center text-xs text-gray-500">{img.title}</figcaption>}
        </figure>
        {active && (
          <LightboxDialog
            open={!!active}
            onClose={() => setActive(null)}
            src={active.url}
            alt={active.alt}
            title={active.title}
          />
        )}
      </>
    );
  }

  // Multiple images: simple scroll-snap carousel (no extra deps)
  return (
    <>
      <div className={`rounded-xl border border-gray-200 bg-white p-2 shadow-sm ${className ?? ""}`}>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {unique.map((img, idx) => {
            const proxied = toProxied(img);
            return (
              <figure key={img.url} className="snap-start shrink-0">
                <button
                  type="button"
                  onClick={() => setActive(img)}
                  className="relative h-64 w-[22rem] overflow-hidden rounded-lg cursor-zoom-in"
                >
                  <Image
                    src={img.url}
                    alt={img.alt || img.title || `Image ${idx + 1}`}
                    fill
                    className="object-contain"
                    sizes="352px"
                  />
                </button>
                {img.title && (
                  <figcaption className="mt-1 text-center text-[11px] text-gray-500">{img.title}</figcaption>
                )}
              </figure>
            );
          })}
        </div>
      </div>
      {active && (
        <LightboxDialog
          open={!!active}
          onClose={() => setActive(null)}
          src={active.url}
          alt={active.alt}
          title={active.title}
        />
      )}
    </>
  );
}
