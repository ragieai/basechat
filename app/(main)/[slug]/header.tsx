"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { z } from "zod";

import Logo from "@/components/tenant/logo/logo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { tenantListResponseSchema, updateCurrentProfileSchema } from "@/lib/api";
import { getTenantPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

import CheckIcon from "../../../public/icons/check.svg";
import HamburgerIcon from "../../../public/icons/hamburger.svg";
import LogOutIcon from "../../../public/icons/log-out.svg";
import NewChatIcon from "../../../public/icons/new-chat.svg";
import PlusIcon from "../../../public/icons/plus.svg";

import ConversationHistory from "./conversation-history";

interface Props {
  currentProfileId: string;
  tenant: {
    name?: string | null;
    logoUrl?: string | null;
    slug: string;
  };
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

export default function Header({ currentProfileId, tenant, onNavClick = () => {} }: Props) {
  const router = useRouter();

  const [tenants, setTenants] = useState<z.infer<typeof tenantListResponseSchema>>([]);
  const [selectedProfileId, setSelectedProfileId] = useState(currentProfileId);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/tenants");
      const tenants = tenantListResponseSchema.parse(await res.json());
      setTenants(tenants);
    })();
  }, []);

  const handleLogOutClick = async () => await signOut();

  const handleProfileClick = async (profileId: string) => {
    await fetch("/api/profiles", {
      method: "POST",
      body: JSON.stringify(
        updateCurrentProfileSchema.parse({
          currentProfileId: profileId,
        }),
      ),
    });
    setSelectedProfileId(profileId);
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
            <ConversationHistory tenant={tenant} />
          </HeaderPopoverContent>
        </Popover>
        <Link href={getTenantPath(tenant.slug)}>
          <Image src={NewChatIcon} alt="New chat" />
        </Link>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <div>
            <Logo
              name={tenant.name ?? ""}
              url={tenant.logoUrl}
              width={32}
              height={32}
              className="bg-[#66666E] font-semibold text-[16px] cursor-pointer"
            />
          </div>
        </PopoverTrigger>
        <HeaderPopoverContent align="end" className="p-4 w-[332px]">
          <ul>
            {tenants.map((tenant, i) => (
              <li
                key={i}
                className="hover:bg-black hover:bg-opacity-5 px-4 py-3 rounded-lg cursor-pointer"
                onClick={() => handleProfileClick(tenant.profileId)}
              >
                <div className="flex items-center mb-1">
                  <div className="w-4">
                    {selectedProfileId === tenant.profileId && <Image src={CheckIcon} alt="selected" />}
                  </div>
                  <Logo
                    name={tenant.name}
                    url={tenant.logoUrl}
                    width={40}
                    height={40}
                    className="ml-3 text-[16px] avatar w-[40px] h-[40px]"
                  />
                  <div className="ml-4">{tenant.name}</div>
                </div>
              </li>
            ))}
          </ul>

          <hr className="my-4 bg-black border-none h-[1px] opacity-10" />

          <Link className="flex cursor-pointer" href="/setup">
            <Image src={PlusIcon} alt="New Chatbot" className="mr-3" />
            New Chatbot
          </Link>

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
