import Link from "next/link";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { AppLocation } from "../footer";

const NavItem = ({ children, selected }: { children: ReactNode; selected?: boolean }) => (
  <div className={cn("px-3 py-2 rounded-lg", selected ? "bg-[#F5F5F7] font-semibold" : "")}>{children}</div>
);

type Props = {
  appLocation: AppLocation;
};

export default function SettingsNav({ appLocation }: Props) {
  return (
    <div className="w-[233px] flex flex-col pr-16">
      <Link href="/settings">
        <NavItem selected={appLocation === AppLocation.SETTINGS}>General</NavItem>
      </Link>
      <Link href="/settings/users">
        <NavItem selected={appLocation === AppLocation.SETTINGS_USERS}>Users</NavItem>
      </Link>
    </div>
  );
}
