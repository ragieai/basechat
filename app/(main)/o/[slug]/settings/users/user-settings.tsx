"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogTrigger } from "@radix-ui/react-dialog";
import assertNever from "assert-never";
import { Loader2, MoreHorizontal, Trash } from "lucide-react";
import { redirect } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v3";

import { ManageSeatsDialog } from "@/components/billing/manage-seats-dialog";
import PrimaryButton from "@/components/primary-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Member, MemberRole, MemberType } from "@/lib/api";
import { getBillingSettingsPath } from "@/lib/paths";

const ADMIN_TOOLTIP_CONTENT =
  "Your organization's subscription has expired. Please renew to continue using this chatbot.";

const THRESHOLD = 0.1;

interface Props {
  initialMembers: Member[];
  initialTotalUsers: number;
  initialTotalInvites: number;
  pageSize: number;
  tenant: {
    slug: string;
    paidStatus: string;
    id: string;
  };
  currentPlanSeats?: number;
  currentPlan?: string;
}

const formSchema = z.object({
  emails: z.array(z.string().email(), { message: "Invalid email address" }).min(1),
  role: z.union([z.literal("admin"), z.literal("user")]),
});

const errorSchema = z.object({
  error: z.string(),
});

const roleItems = [
  { name: "Admin", value: "admin" as const, description: "Manage account, users and chatbot data" },
  { name: "User", value: "user" as const, description: "Can chat with data added by Admins" },
];

const RoleSelectItem = ({ item }: { item: { name: string; value: MemberRole; description: string } }) => (
  <>
    <SelectItem className="hover:bg-[#F5F5F7]" value={item.value}>
      <div>{item.name}</div>
    </SelectItem>
    <div className="px-2 pt-1 pb-2 text-xs cursor-default">{item.description}</div>
  </>
);

export default function UserSettings({
  initialMembers,
  initialTotalUsers,
  initialTotalInvites,
  pageSize,
  tenant,
  currentPlanSeats,
  currentPlan,
}: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [totalUsers, setTotalUsers] = useState(initialTotalUsers);
  const [totalInvites, setTotalInvites] = useState(initialTotalInvites);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [manageSeatsOpen, setManageSeatsOpen] = useState(false);
  const [requiredSeats, setRequiredSeats] = useState(0);
  const [isSavingSeats, setIsSavingSeats] = useState(false);
  const [effectiveSeats, setEffectiveSeats] = useState(currentPlanSeats || 0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const openSeats = currentPlanSeats ? currentPlanSeats - (totalUsers + totalInvites) : 0;

  const chatbotDisabled = tenant.paidStatus === "expired";
  const chatbotFreeTier = tenant.paidStatus === "trial";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { emails: [], role: "admin" },
  });

  const resetForm = () => {
    form.reset();
  };

  const needMoreSeats = (
    effectiveSeats: number | undefined,
    currentPlan: string | undefined,
    currentUsage?: number,
  ): boolean => {
    if (effectiveSeats === undefined || currentPlan === undefined || currentPlan === "developer") {
      return false;
    }
    if (currentUsage !== undefined) {
      return currentUsage > effectiveSeats;
    }
    return false;
  };

  const handleEmailsChange = (value: string) => {
    form.clearErrors();
    const emails = value
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    form.setValue("emails", emails);
  };

  const fetchMembers = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/tenants/current/members?page=${page}&pageSize=${pageSize}`, {
          headers: { tenant: tenant.slug },
        });
        const data = await res.json();
        setMembers((prev) => [...(prev || []), ...data.members]);
        setTotalUsers(data.totalUsers);
        setTotalInvites(data.totalInvites);
        setCurrentPage(page);
      } catch (error) {
        toast.error("Failed to fetch members");
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize, tenant.slug, setMembers, setTotalUsers, setTotalInvites, setCurrentPage, setIsLoading],
  );

  const loadMore = useCallback(() => {
    if (isLoading || members.length >= totalUsers) return;
    fetchMembers(currentPage + 1);
  }, [currentPage, isLoading, members.length, totalUsers, fetchMembers]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: THRESHOLD },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [loadMore]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const currentUsage = totalUsers + totalInvites + values.emails.length;
    const needsMoreSeats = needMoreSeats(effectiveSeats, currentPlan, currentUsage);

    if (needsMoreSeats) {
      toast.error("You need to add more seats to continue");
      redirect(getBillingSettingsPath(tenant.slug));
      return;
    }

    setIsLoading(true);

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { tenant: tenant.slug },
      body: JSON.stringify(values),
    });
    if (res.status !== 200) {
      toast.error("Invite failed.  Try again later.");
      setIsLoading(false);
      return;
    }
    const payload = await res.json();

    setDialogOpen(false);
    setIsLoading(false);
    setTotalInvites((prev) => Number(prev) + Number(values.emails.length));
    toast.success("Invites sent");
    resetForm();

    const newMembers = payload.map((invite: any) => ({
      id: invite.id,
      name: null,
      email: invite.email,
      type: "invite" as MemberType,
      role: invite.role as MemberRole,
    }));

    setMembers([...members, ...newMembers]);
  }

  const deleteInvite = async (id: string) => {
    const res = await fetch(`/api/invites/${id}`, {
      method: "DELETE",
      headers: { tenant: tenant.slug },
    });
    if (!res.ok) {
      toast.error("Could not delete invite");
      return;
    }

    toast.info("Invite was deleted");
    setMembers(members.filter((m) => m.type !== "invite" || m.id !== id));
    setTotalInvites((prev) => Number(prev) - 1);
  };

  const deleteProfile = async (id: string) => {
    const res = await fetch(`/api/profiles/${id}`, {
      method: "DELETE",
      headers: { tenant: tenant.slug },
    });
    if (!res.ok) {
      const payload = errorSchema.parse(await res.json());
      toast.error(`Error: ${payload.error}`);
      return;
    }

    toast.info("User was deleted");
    setMembers(members.filter((m) => m.role !== "user" || m.id !== id));
  };

  const changeProfileRole = async (id: string, role: MemberRole) => {
    const res = await fetch(`/api/profiles/${id}`, {
      method: "PATCH",
      headers: { tenant: tenant.slug },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const payload = errorSchema.parse(await res.json());
      toast.error(`Error: ${payload.error}`);
      return;
    }
    toast.info("Role was changed");
  };

  const changeInviteRole = async (id: string, role: MemberRole) => {
    const res = await fetch(`/api/invites/${id}`, {
      method: "PATCH",
      headers: { tenant: tenant.slug },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      toast.error("Could not change role");
      return;
    }
    toast.info("Role was changed");
  };

  const handleDelete = (id: string, type: MemberType, role: MemberRole) => {
    switch (type) {
      case "invite":
        return deleteInvite(id);
      case "profile": {
        return deleteProfile(id);
      }
      default:
        return assertNever(type);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    resetForm();
  };

  const handleRoleChange = (id: string, type: MemberType, newRole: MemberRole) => {
    switch (type) {
      case "profile":
        return changeProfileRole(id, newRole);
      case "invite":
        return changeInviteRole(id, newRole);
      default:
        assertNever(type);
    }
  };

  const handleSaveSeats = async (newSeats: number) => {
    try {
      setIsSavingSeats(true);
      const response = await fetch(`/api/billing/update-seats`, {
        method: "POST",
        body: JSON.stringify({ seats: newSeats }),
        headers: { tenant: tenant.slug },
      });

      if (!response.ok) {
        throw new Error("Failed to update seats");
      }
      toast.success("Successfully updated team seats");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setEffectiveSeats(newSeats);
    } catch (error) {
      toast.error("Failed to update team seats");
      console.error("Error updating seats:", error);
    } finally {
      setIsSavingSeats(false);
    }
  };

  return (
    <div className="w-full p-4 flex-grow flex flex-col">
      <div className="flex w-full justify-between items-center mb-8">
        <h1 className="font-bold text-[32px] text-[#343A40]">Users</h1>
        <div className="flex">
          <div className="flex flex-col justify-end">
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              {chatbotDisabled ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <PrimaryButton disabled>Invite</PrimaryButton>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{ADMIN_TOOLTIP_CONTENT}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <DialogTrigger asChild>
                  <PrimaryButton>Invite</PrimaryButton>
                </DialogTrigger>
              )}
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Invite users</DialogTitle>
                </DialogHeader>
                {effectiveSeats !== undefined && currentPlan !== undefined && currentPlan !== "developer" && (
                  <div className="text-sm text-[#74747A] mt-2">
                    {(() => {
                      const currentUsage = totalUsers + totalInvites + (form.getValues("emails")?.length || 0);
                      const remaining = effectiveSeats - currentUsage;
                      if (remaining > 0) {
                        return `${remaining} seat${remaining === 1 ? "" : "s"} left`;
                      } else if (remaining === 0) {
                        return "0 seats left";
                      } else {
                        const additional = Math.abs(remaining);
                        return `0 seats left, ${additional} additional seat${additional === 1 ? "" : "s"} required`;
                      }
                    })()}
                  </div>
                )}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                      control={form.control}
                      name="emails"
                      render={({ field }) => (
                        <FormItem>
                          <FormMessage>Must use valid email addresses</FormMessage>
                          <FormControl>
                            <textarea
                              placeholder="Email addresses, comma separated"
                              className="w-full rounded-lg border border-[#D946EF] bg-[#F5F5F7] px-3 py-2 shadow-none min-h-[80px] max-h-[200px] resize-none overflow-y-auto"
                              onChange={(e) => handleEmailsChange(e.target.value)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Role</FormLabel>
                          <FormMessage>Must select a role</FormMessage>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl className="focus:ring-[#D946EF]">
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roleItems.map((option, i) => (
                                <RoleSelectItem key={i} item={option} />
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <DialogFooter className="mt-8">
                      {(() => {
                        const currentUsage = totalUsers + totalInvites + (form.getValues("emails")?.length || 0);
                        const needsMoreSeats = needMoreSeats(effectiveSeats, currentPlan, currentUsage);
                        const additionalSeats = currentUsage - effectiveSeats;

                        if (needsMoreSeats) {
                          return (
                            <div className="flex justify-end w-full">
                              <div className="relative">
                                {isSavingSeats && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                  </div>
                                )}
                                <PrimaryButton
                                  type="button"
                                  onClick={() => {
                                    setRequiredSeats(additionalSeats);
                                    setManageSeatsOpen(true);
                                  }}
                                  disabled={isSavingSeats}
                                >
                                  Add {additionalSeats} Seat{additionalSeats === 1 ? "" : "s"} to Continue
                                </PrimaryButton>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <>
                            <PrimaryButton type="submit" disabled={!form.getValues("emails")?.length}>
                              {`Send invite${form.getValues("emails")?.length === 1 ? "" : "s"}`}
                            </PrimaryButton>
                            {isLoading && <Loader2 size={18} className="ml-2 animate-spin" />}
                          </>
                        );
                      })()}
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <div className="mt-14">
        <div className="text-[#74747A] mb-1.5 flex">
          <div>
            {totalUsers + totalInvites} {totalUsers + totalInvites === 1 ? "user" : "users"}
          </div>
          {!chatbotFreeTier && (
            <div className="ml-4">
              {openSeats} {openSeats == 1 ? "open seat" : "open seats"}
            </div>
          )}
        </div>
        <div className="max-h-[calc(100vh-365px)] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow noHover>
                <TableHead className="font-semibold text-[13px] text-[#74747A] pl-0">Name</TableHead>
                <TableHead className="font-semibold text-[13px] text-[#74747A] w-[92px]">Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} noHover>
                  <TableCell className="flex items-center pl-0 h-[52px]">
                    {member.type === "profile" ? (
                      <>
                        <div className="mr-2">{member.name}</div>
                        <div className="text-[#74747A]">{member.email}</div>
                      </>
                    ) : (
                      <>
                        <div className="mr-2">{member.email}</div>
                        <div className="text-[#74747A] rounded border-[#D7D7D7] border py-1 px-2">Pending</div>
                      </>
                    )}
                  </TableCell>
                  <TableCell className="capitalize w-[100px]">
                    <Select
                      onValueChange={(newRole) => handleRoleChange(member.id, member.type, newRole as MemberRole)}
                      defaultValue={member.role}
                    >
                      <SelectTrigger className="border-none">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleItems.map((option, i) => (
                          <RoleSelectItem key={i} item={option} />
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button>
                          <MoreHorizontal />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleDelete(member.id, member.type, member.role)}>
                          <Trash />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div ref={loadMoreRef} className="h-4 w-full mb-8">
            {isLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
      <ManageSeatsDialog
        open={manageSeatsOpen}
        onOpenChange={setManageSeatsOpen}
        currentSeats={effectiveSeats}
        onSave={handleSaveSeats}
        tenantId={tenant.id}
        initialAdditionalSeats={requiredSeats}
        lightBackground={true}
        initialOpenSeats={0}
        inviteFlow={true}
      />
    </div>
  );
}
