"use client";

import { Tag, TagInput } from "emblor";
import { MoreHorizontal, Trash } from "lucide-react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Profile } from "@/lib/schema";

interface Props {
  profiles: Profile[];
}

export default function UserSettings({ profiles }: Props) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTagIndex, setActiveTagIndex] = useState<number | null>(null);
  return (
    <div className="w-full p-4 flex-grow flex flex-col">
      <div className="flex w-full justify-between items-center pt-2">
        <h1 className="font-bold text-[32px]">Users</h1>
        <div className="flex">
          <TagInput
            placeholder="Email address, comma separated"
            styleClasses={{
              input: "shadow-none",
              inlineTagsContainer: "rounded-lg border border-[#9A57F6] bg-[#F5F5F7] w-[360px] px-1 py-1.5",
              tag: { body: "pl-3 hover:bg-[#ffffff] bg-[#ffffff]" },
            }}
            tags={tags}
            setTags={setTags}
            activeTagIndex={activeTagIndex}
            setActiveTagIndex={setActiveTagIndex}
          />
          <button className="font-semibold text-white rounded-lg bg-[#D946EF] px-4 py-2.5 ml-3">Invite</button>
        </div>
      </div>
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
