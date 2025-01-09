"use client";

import { MoreHorizontal, Trash } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function UserSettings() {
  return (
    <div className="w-full p-4 flex-grow flex flex-col">
      <div className="flex w-full justify-between items-center pt-2">
        <h1 className="font-bold text-[32px]">Users</h1>
        <div className="flex">
          <input
            type="text"
            className="rounded-lg border border-[#9A57F6] bg-[#F5F5F7] w-[360px] px-3 py-2.5"
            placeholder="Email address, comma separated"
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
              <TableHead className="font-semibold text-[13px] text-[#74747A] w-[200px]">Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow key={1}>
              <TableCell className="flex pl-0">
                <div className="mr-2">John Smith</div>
                <div className="text-[#74747A]">john@example.com</div>
              </TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Few seconds ago</TableCell>
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
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
