"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DialogTrigger } from "@radix-ui/react-dialog";
import assertNever from "assert-never";
import { Loader2, MoreHorizontal, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Member, MemberRole, MemberType } from "@/lib/api";

interface Props {
  members: Member[];
  tenant: {
    slug: string;
  };
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

export default function UserSettings({ members: initialMembers, tenant }: Props) {
  const [members, setMembers] = useState(initialMembers);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { emails: [], role: "admin" },
  });

  const resetForm = () => {
    form.reset();
  };

  const handleEmailsChange = (value: string) => {
    form.clearErrors();
    const emails = value
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    form.setValue("emails", emails);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { tenant: tenant.slug },
      body: JSON.stringify(values),
    });
    if (res.status !== 200) {
      toast.error("Invite failed.  Try again later.");
      setLoading(false);
      return;
    }

    setDialogOpen(false);
    setLoading(false);
    toast.success("Invites sent");
    resetForm();

    const newMembers = values.emails.map((email) => ({
      id: "",
      name: null,
      email,
      type: "invite" as MemberType,
      role: values.role as MemberRole,
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

  const userCount = useMemo(() => members.filter((m) => m.type !== "invite").length, [members]);
  const inviteCount = useMemo(() => members.filter((m) => m.type === "invite").length, [members]);

  return (
    <div className="w-full p-4 flex-grow flex flex-col">
      <div className="flex w-full justify-between items-center pt-2">
        <h1 className="font-bold text-[32px]">Users</h1>
        <div className="flex">
          <div className="flex flex-col justify-end">
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <PrimaryButton>Invite</PrimaryButton>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Invite users</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <FormField
                      control={form.control}
                      name="emails"
                      render={({ field }) => (
                        <FormItem>
                          <FormMessage>Must use valid email addresses</FormMessage>
                          <FormControl>
                            <input
                              type="text"
                              placeholder="Email addresses, comma separated"
                              className="w-full rounded-lg border border-[#D946EF] bg-[#F5F5F7] px-3 py-2 shadow-none"
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
                      <PrimaryButton type="submit" disabled={!form.getValues("emails")?.length}>
                        Send invite
                        {isLoading && <Loader2 size={18} className="ml-2 animate-spin" />}
                      </PrimaryButton>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <div className="mt-16">
        <div className="text-[#74747A] mb-1.5 flex">
          <div>
            {userCount} {userCount == 1 ? "user" : "users"}
          </div>
          {inviteCount > 0 && (
            <div className="ml-4">
              {inviteCount} {inviteCount == 1 ? "invite" : "invites"}
            </div>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-[13px] text-[#74747A] pl-0">Name</TableHead>
              <TableHead className="font-semibold text-[13px] text-[#74747A] w-[92px]">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member, i) => (
              <TableRow key={i}>
                <TableCell className="flex items-center pl-0">
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
      </div>
    </div>
  );
}
