"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { AppLocation } from "../footer";

const NavItem = ({ children, selected }: { children: ReactNode; selected?: boolean }) => (
  <div className={cn("px-3 py-2 rounded-lg", selected ? "bg-[#F5F5F7] font-semibold" : "")}>{children}</div>
);

function getAppLocation(path: string): AppLocation {
  if (path.includes("/settings/users")) {
    return AppLocation.SETTINGS_USERS;
  }

  return AppLocation.SETTINGS;
}

interface Props {
  tenantSlug: string;
}

export default function SettingsNav({ tenantSlug }: Props) {
  const pathname = usePathname();
  const appLocation = getAppLocation(pathname);

  return (
    <div className="w-[233px] flex flex-col pr-16">
      <Link href={`/${tenantSlug}/settings`}>
        <NavItem selected={appLocation === AppLocation.SETTINGS}>General</NavItem>
      </Link>
      <Link href={`/${tenantSlug}/settings/users`}>
        <NavItem selected={appLocation === AppLocation.SETTINGS_USERS}>Users</NavItem>
      </Link>
    </div>
  );
}
