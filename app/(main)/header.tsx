"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { z } from "zod";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { tenantListResponseSchema, updateCurrentProfileSchema } from "@/lib/schema";
import { cn, getInitials } from "@/lib/utils";

import CheckIcon from "../../public/icons/check.svg";
import HamburgerIcon from "../../public/icons/hamburger.svg";
import LogOutIcon from "../../public/icons/log-out.svg";
import NewChatIcon from "../../public/icons/new-chat.svg";

import ConversationHistory from "./conversation-history";

interface Props {
  currentTenantId: string;
  className?: string;
  name?: string | null;
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

export default function Header({ name, currentTenantId, onNavClick = () => {} }: Props) {
  const handleLogOutClick = async () => await signOut();
  const router = useRouter();

  const [tenants, setTenants] = useState<z.infer<typeof tenantListResponseSchema>>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/tenants");
      const tenants = tenantListResponseSchema.parse(await res.json());
      setTenants(tenants);
    })();
  }, []);

  const handleTenantClick = async (profileId: string) => {
    await fetch("/api/profiles", {
      method: "POST",
      body: JSON.stringify(
        updateCurrentProfileSchema.parse({
          currentProfileId: profileId,
        }),
      ),
    });
    router.push("/");
  };

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
          <div className="bg-[#66666E] rounded-[16px] h-[32px] w-[32px] flex items-center justify-center text-[#FEFEFE] font-semibold cursor-pointer">
            {name?.trim()[0].toUpperCase()}
          </div>
        </PopoverTrigger>
        <HeaderPopoverContent align="end" className="p-4 w-[332px]">
          <ul>
            {tenants.map((tenant, i) => (
              <li
                key={i}
                className="hover:bg-black hover:bg-opacity-5 px-4 py-3 rounded-lg cursor-pointer"
                onClick={() => handleTenantClick(tenant.profileId)}
              >
                <div className="flex items-center mb-1">
                  <div className="w-4">{currentTenantId === tenant.id && <Image src={CheckIcon} alt="selected" />}</div>
                  <TenantLogo name={tenant.name} className="ml-3" />
                  <div className="ml-4">{tenant.name}</div>
                </div>
              </li>
            ))}
          </ul>

          <hr className="my-4 bg-black border-none h-[1px] opacity-10" />
          <div className="flex cursor-pointer" onClick={handleLogOutClick}>
            <Image src={LogOutIcon} alt="Log out" className="mr-3" />
            Log out
          </div>
        </HeaderPopoverContent>
      </Popover>
    </header>
  );
}

function TenantLogo({ name, className }: { name: string; className?: string }) {
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        "h-[40px] w-[40px] avatar rounded-[20px] text-white flex items-center justify-center font-bold text-[16px]",
        className,
      )}
    >
      {initials}
    </div>
  );
}
