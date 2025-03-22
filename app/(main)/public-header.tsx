"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

import Logo from "@/components/tenant/logo/logo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import HamburgerIcon from "../../public/icons/hamburger.svg";
import NewChatIcon from "../../public/icons/new-chat.svg";

import ConversationHistory from "./conversation-history";

interface Props {
  className?: string;
  onNavClick?: () => void;
}

const HeaderPopoverContent = ({
  children,
  className,
  align,
}: {
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) => (
  <PopoverContent
    align={align}
    className={cn("bg-[#F5F5F7] w-[258px] border-none shadow-none rounded-[24px] p-6", className)}
  >
    {children}
  </PopoverContent>
);

export default function PublicHeader({ onNavClick = () => {} }: Props) {
  return (
    <header className="w-full shrink-0 flex justify-between p-4 items-center">
      <div className="flex">
        <Popover>
          <PopoverTrigger asChild>
            <Image src={HamburgerIcon} alt="Expand chats" className="mr-2.5 cursor-pointer" onClick={onNavClick} />
          </PopoverTrigger>
          <HeaderPopoverContent align="start">
            <ConversationHistory />
          </HeaderPopoverContent>
        </Popover>
        <Link href="/">
          <Image src={NewChatIcon} alt="New chat" />
        </Link>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <div>
            <Logo
              name="R"
              url={null}
              width={32}
              height={32}
              className="bg-[#66666E] font-semibold text-[16px] cursor-pointer"
            />
          </div>
        </PopoverTrigger>
        <HeaderPopoverContent align="end" className="p-4 w-[332px]">
          <Link href="/sign-up" className="flex cursor-pointer px-4 py-3 rounded-lg hover:bg-black hover:bg-opacity-5">
            Sign up
          </Link>

          <hr className="my-4 bg-black border-none h-[1px] opacity-10" />

          <a
            href="https://ragie.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex cursor-pointer px-4 py-3 rounded-lg hover:bg-black hover:bg-opacity-5"
          >
            Try Ragie
          </a>
        </HeaderPopoverContent>
      </Popover>
    </header>
  );
}
