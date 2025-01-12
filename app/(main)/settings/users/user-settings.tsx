"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Tag, TagInput } from "emblor";
import { MoreHorizontal, Trash } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Profile } from "@/lib/schema";

interface Props {
  profiles: Profile[];
}

const formSchema = z.object({
  emails: z.array(z.string().email(), { message: "Invalid email address" }),
});

export default function UserSettings({ profiles }: Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { emails: [] },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const res = await fetch("/api/invites", { method: "POST", body: JSON.stringify(values) });
    if (res.status !== 200) {
      toast.error("Invite failed.  Try again later.");
      return;
    }
  }

  const { setValue } = form;

  return (
    <div className="w-full p-4 flex-grow flex flex-col">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex w-full justify-between items-center pt-2">
            <h1 className="font-bold text-[32px]">Users</h1>
            <div className="flex">
              <FormField
                control={form.control}
                name="emails"
                render={({ field }) => (
                  <FormItem>
                    <FormMessage>Must use valid email addresses</FormMessage>
                    <FormControl>
                      <TagInput
                        placeholder="Email address, comma separated"
                        styleClasses={{
                          input: "shadow-none",
                          inlineTagsContainer: "rounded-lg border border-[#9A57F6] bg-[#F5F5F7] w-[360px] px-1 py-1.5",
                          tag: { body: "pl-3 hover:bg-[#ffffff] bg-[#ffffff]" },
                        }}
                        tags={tags}
                        setTags={(tags) => {
                          setTags(tags);
                          setValue(
                            "emails",
                            (tags as Tag[]).map((t) => t.text),
                          );
                        }}
                        activeTagIndex={activeTagIndex}
                        setActiveTagIndex={setActiveTagIndex}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex flex-col justify-end">
                <button type="submit" className="font-semibold text-white rounded-lg bg-[#D946EF] px-4 py-2.5 ml-3">
                  Invite
                </button>
              </div>
            </div>
          </div>
        </form>
      </Form>
      <div className="mt-16">
        <div className="text-[#74747A] mb-1.5">1 user</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-[13px] text-[#74747A] pl-0">Name</TableHead>
              <TableHead className="font-semibold text-[13px] text-[#74747A] w-[92px]">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={1}>
                <TableCell className="flex pl-0">
                  <div className="mr-2">{profile.name}</div>
                  <div className="text-[#74747A]">{profile.email}</div>
                </TableCell>
                <TableCell>Owner</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button>
                        <MoreHorizontal />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => null}>
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
