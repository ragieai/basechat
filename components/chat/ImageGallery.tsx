"use client";

import Image from "next/image";
import * as React from "react";

export type ChatImage = {
  url: string;
  alt?: string;
  title?: string;
  sourceUrl?: string; // original doc/source link if available
};

type Props = {
  images: ChatImage[];
  className?: string;
};

export default function ImageGallery({ images, className }: Props) {
  if (!images?.length) return null;

  const unique = Array.from(new Map(images.map((i) => [i.url, i])).values());
  if (unique.length === 1) {
    const img = unique[0];
    return (
      <figure className={`rounded-xl border border-gray-200 bg-white p-2 shadow-sm ${className ?? ""}`}>
        <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-lg">
          {/* Note: remotePatterns must allow api.ragie.ai */}
          <Image
            src={img.url}
            alt={img.alt || img.title || "Image"}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 700px"
            priority
          />
        </div>
        {(img.title || img.sourceUrl) && (
          <figcaption className="mt-2 text-center text-xs text-gray-500">
            {img.title}
            {img.sourceUrl && (
              <>
                {" "}
                ·{" "}
                <a className="underline" href={img.sourceUrl} target="_blank" rel="noreferrer">
                  open source
                </a>
              </>
            )}
          </figcaption>
        )}
      </figure>
    );
  }

  // Multiple images: simple scroll-snap carousel (no extra deps)
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-2 shadow-sm ${className ?? ""}`}>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
        {unique.map((img, idx) => (
          <figure key={img.url} className="snap-start shrink-0">
            <div className="relative h-64 w-[22rem] overflow-hidden rounded-lg">
              <Image
                src={img.url}
                alt={img.alt || img.title || `Image ${idx + 1}`}
                fill
                className="object-contain"
                sizes="352px"
              />
            </div>
            {(img.title || img.sourceUrl) && (
              <figcaption className="mt-1 text-center text-[11px] text-gray-500">
                {img.title}
                {img.sourceUrl && (
                  <>
                    {" "}
                    ·{" "}
                    <a className="underline" href={img.sourceUrl} target="_blank" rel="noreferrer">
                      open source
                    </a>
                  </>
                )}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </div>
  );
}
