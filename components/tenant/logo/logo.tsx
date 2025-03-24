"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

interface Props {
  name?: string | null;
  url?: string | null;
  className?: string;
  width: number;
  height: number;
}

export default function Logo({ name, url, width, height, className }: Props) {
  const formattedName = name ? getInitials(name) : "";

  if (!url) {
    return (
      <div
        className={cn("rounded-full text-white flex items-center justify-center font-bold text-[32px]", className)}
        style={{ height, width }}
      >
        {formattedName}
      </div>
    );
  }

  return <Image src={url} alt={formattedName} className={cn("rounded", className)} height={height} width={width} />;
}
