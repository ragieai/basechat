import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

import ChatIconOff from "../../public/icons/chat-off.svg";
import ChatIconOn from "../../public/icons/chat-on.svg";
import DataIconOff from "../../public/icons/data-off.svg";
import DataIconOn from "../../public/icons/data-on.svg";
import SettingsIconOff from "../../public/icons/settings-off.svg";
import SettingsIconOn from "../../public/icons/settings-on.svg";

export enum AppLocation {
  CHAT,
  DATA,
  SETTINGS,
  SETTINGS_USERS,
}

export function NavButton({ alt, src, className }: { alt: string; src: any; className?: string }) {
  return (
    <div className={cn("flex flex-col w-20 text-white items-center", className)}>
      <Image alt={alt} src={src} className="mb-2.5" />
      <div className="text-[14px]">{alt}</div>
    </div>
  );
}

interface Props {
  appLocation: AppLocation;
  className?: string;
}

export default function Footer({ appLocation, className }: Props) {
  const chatIcon = appLocation === AppLocation.CHAT ? ChatIconOn : ChatIconOff;
  const chatClassName = appLocation === AppLocation.CHAT ? "mr-5 font-semibold" : "mr-5";

  const dataIcon = appLocation === AppLocation.DATA ? DataIconOn : DataIconOff;
  const dataClassName = appLocation === AppLocation.DATA ? "mr-5 font-semibold" : "mr-5";

  const settingsIcon = appLocation === AppLocation.SETTINGS ? SettingsIconOn : SettingsIconOff;
  const settingsClassName = appLocation === AppLocation.SETTINGS ? "mr-5 font-semibold" : "mr-5";

  return (
    <div className={className}>
      <div className="flex">
        <Link href="/">
          <NavButton alt="Chat" src={chatIcon} className={chatClassName} />
        </Link>
        <Link href="/data">
          <NavButton alt="My Data" src={dataIcon} className={dataClassName} />
        </Link>
        <Link href="/settings">
          <NavButton alt="Settings" src={settingsIcon} className={settingsClassName} />
        </Link>
      </div>
    </div>
  );
}
