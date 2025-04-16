"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import Logo from "@/components/tenant/logo/logo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { tenantListResponseSchema, updateCurrentProfileSchema } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { getSignInPath, getSignUpPath, getTenantPath } from "@/lib/paths";
import { cn } from "@/lib/utils";
import AnonProfileIcon from "@/public/icons/anonymous-profile.svg";
import CheckIcon from "@/public/icons/check.svg";
import EllipsesIcon from "@/public/icons/ellipses.svg";
import HamburgerIcon from "@/public/icons/hamburger.svg";
import LogOutIcon from "@/public/icons/log-out.svg";
import NewChatIcon from "@/public/icons/new-chat.svg";
import PlusIcon from "@/public/icons/plus.svg";

import ConversationHistory from "./conversation-history";

const errorSchema = z.object({
  error: z.string(),
});

interface Props {
  tenant: {
    name?: string | null;
    logoUrl?: string | null;
    slug: string;
    id: string;
  };
  name: string | undefined | null;
  email: string | undefined | null;
  isAnonymous: boolean;
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

const TenantPopoverContent = ({ children }: { children: React.ReactNode }) => (
  <PopoverContent
    align="end"
    alignOffset={-60}
    side="right"
    sideOffset={-20}
    className={cn("bg-[#F5F5F7] w-[120px] border border-[#D7D7D7] shadow-none rounded-[6px] mt-2 p-3")}
  >
    {children}
  </PopoverContent>
);

export default function Header({ isAnonymous, tenant, name, email, onNavClick = () => {} }: Props) {
  const router = useRouter();
  const [tenants, setTenants] = useState<z.infer<typeof tenantListResponseSchema>>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/tenants");
      const tenants = tenantListResponseSchema.parse(await res.json());
      setTenants(tenants);
    })();
  }, []);

  const handleLogOutClick = async () =>
    await signOut({
      fetchOptions: {
        onSuccess: () => router.push(getSignInPath()),
      },
    });

  const handleProfileClick = async (tenant: z.infer<typeof tenantListResponseSchema>[number]) => {
    await fetch("/api/profiles", {
      method: "POST",
      body: JSON.stringify(
        updateCurrentProfileSchema.parse({
          tenantId: tenant.id,
        }),
      ),
    });
    router.push(getTenantPath(tenant.slug));
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

      {isAnonymous ? (
        <div className="flex">
          <Link
            className="rounded-lg bg-[#D946EF] text-white px-4 py-2.5 mr-6 flex items-center"
            href={getSignUpPath()}
          >
            Create my own chatbot
          </Link>
          <Image src={AnonProfileIcon} alt={name || "Guest"} />
        </div>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <div>
              <Logo
                name={name}
                width={32}
                height={32}
                className="bg-[#66666E] font-semibold text-[16px] cursor-pointer"
                initialCount={1}
              />
            </div>
          </PopoverTrigger>
          <HeaderPopoverContent align="end" className="p-4 w-[332px] flex flex-col">
            <div className="text-sm text-gray-500 font-semibold ml-6 mb-3 mt-3">{email}</div>

            {/* Scrollable container for tenants list */}
            <div className="max-h-[calc(100vh-330px)] overflow-y-auto pr-1 scrollbar-thin mb-4">
              <ul>
                {tenants.map((tenantItem, i) => (
                  <li
                    key={i}
                    className="hover:bg-black hover:bg-opacity-5 px-4 py-3 rounded-lg cursor-pointer group"
                    onClick={() => handleProfileClick(tenantItem)}
                  >
                    <div className="flex items-center mb-1">
                      <div className="w-4">
                        {tenant.id === tenantItem.id && <Image src={CheckIcon} alt="selected" />}
                      </div>
                      <Logo
                        name={tenantItem.name}
                        url={tenantItem.logoUrl}
                        width={40}
                        height={40}
                        className="ml-3 text-[16px] w-[40px] h-[40px]"
                        tenantId={tenantItem.id}
                      />
                      <div className="ml-4 flex-1">
                        {tenantItem.name}
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {tenantItem.profileRole === "admin" && (
                            <span className="bg-[#989898] text-[#F5F5F7] w-[45px] h-[18px] rounded-[4px] px-1 py-0.5 text-[12px] font-medium flex items-center justify-center">
                              Admin
                            </span>
                          )}
                          {tenantItem.userCount ?? 1} User{(tenantItem.userCount ?? 1) === 1 ? "" : "s"}
                        </div>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Image
                            src={EllipsesIcon}
                            height={16}
                            width={16}
                            alt="Options"
                            className={cn(
                              "flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity",
                              tenantItem.lastAdmin && "opacity-0 cursor-not-allowed",
                            )}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </PopoverTrigger>
                        {!tenantItem.lastAdmin && (
                          <TenantPopoverContent>
                            <button
                              className="text-sm text-black hover:text-gray-700"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const res = await fetch(`/api/profiles/${tenantItem.profileId}`, {
                                  method: "DELETE",
                                  headers: { tenant: tenantItem.slug },
                                });
                                if (!res.ok) {
                                  try {
                                    const payload = errorSchema.parse(await res.json());
                                    toast.error(`Error: ${payload.error}`);
                                  } catch (e) {
                                    toast.error(`Error: ${res.statusText || "An unexpected error occurred"}`);
                                  }
                                  return;
                                }
                                toast.info("Left chatbot");
                                // Find a new tenant to switch to
                                const newTenant = tenants.find((t) => t.id !== tenantItem.id);
                                if (!newTenant) {
                                  // If no other tenants, go to empty state
                                  router.push("/empty");
                                  return;
                                }
                                // Set new current tenant and navigate
                                await fetch("/api/profiles", {
                                  method: "POST",
                                  body: JSON.stringify(
                                    updateCurrentProfileSchema.parse({
                                      tenantId: newTenant.id,
                                    }),
                                  ),
                                });
                                router.push(getTenantPath(newTenant.slug));
                              }}
                            >
                              Leave chatbot
                            </button>
                          </TenantPopoverContent>
                        )}
                      </Popover>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Fixed bottom options */}
            <div className="mt-auto">
              <hr className="mb-4 bg-black border-none h-[1px] opacity-10" />

              <Link className="flex cursor-pointer mb-4" href="/setup">
                <Image src={PlusIcon} alt="New Chatbot" className="mr-3" />
                New Chatbot
              </Link>

              <hr className="mb-4 bg-black border-none h-[1px] opacity-10" />

              <div className="flex cursor-pointer" onClick={handleLogOutClick}>
                <Image src={LogOutIcon} alt="Log out" className="mr-3" />
                Log out
              </div>
            </div>
          </HeaderPopoverContent>
        </Popover>
      )}
    </header>
  );
}
