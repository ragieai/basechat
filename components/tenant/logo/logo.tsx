"use client";

import { cn } from "@/lib/utils";
import { getInitials, getAvatarNumber } from "@/lib/utils";

interface Props {
  name?: string | null;
  url?: string | null;
  className?: string;
  width: number;
  height: number;
  initialCount?: number;
  tenantId?: string;
}

export default function Logo({ name, url, width, height, className, initialCount = 2, tenantId }: Props) {
  const formattedName = name ? getInitials(name, initialCount) : "";
  const avatarClass = tenantId ? `avatar-${getAvatarNumber(tenantId)}` : "";

  if (!url) {
    return (
      <div
        className={cn(
          "rounded-full text-white flex items-center justify-center font-bold text-[32px]",
          avatarClass,
          className,
        )}
        style={{ height, width }}
      >
        {formattedName}
      </div>
    );
  }

  // These images could come from any source, <Image /> would need additional set up per external resource
  // Just use <img /> for now.
  // https://nextjs.org/docs/pages/api-reference/components/image#remotepatterns
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={formattedName} className={cn("rounded", className)} height={height} width={width} />;
}
