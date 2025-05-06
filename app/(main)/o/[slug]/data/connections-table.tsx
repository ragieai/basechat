"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CONNECTOR_MAP from "@/lib/connector-map";
import { getStatusDisplayName } from "@/lib/utils";

import ManageConnectionMenu from "./manage-connection-menu";

interface Props {
  tenant: {
    id: string;
    slug: string;
  };
  connections: any[];
}

export default function ConnectionsTable({ tenant, connections }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  if (connections.length === 0) {
    return null;
  }

  const totalPages = Math.ceil(connections.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentConnections = connections.slice(startIndex, endIndex);

  return (
    <div className="h-full w-full flex flex-col">
      <hr className="my-4" />
      <div className="flex justify-between items-center mb-4">
        <div className="text-[14px] font-[500] text-[#1D1D1F] pl-1">
          {connections.length} {connections.length === 1 ? "connection" : "connections"}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`p-1 rounded-md ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`p-1 rounded-md ${currentPage === totalPages ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[600px]">Name</TableHead>
              <TableHead className="w-[200px]">Added by</TableHead>
              <TableHead className="w-[200px]">Date added</TableHead>
              <TableHead className="w-[200px]">Last synced</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentConnections.map((connection) => (
              <TableRow key={connection.id}>
                <TableCell className="font-medium flex items-center">
                  <Image
                    src={CONNECTOR_MAP[connection.sourceType][1]}
                    alt={CONNECTOR_MAP[connection.sourceType][0]}
                    className="mr-1"
                  />
                  <div>{connection.name}</div>
                </TableCell>
                {/**TODO: add document count TableCell here */}
                <TableCell>{connection.addedBy || "-"}</TableCell>
                <TableCell>{formatDistanceToNow(connection.createdAt, { addSuffix: true })}</TableCell>
                <TableCell>
                  {connection.lastSyncedAt ? formatDistanceToNow(connection.lastSyncedAt, { addSuffix: true }) : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {connection.status !== "ready" && connection.status !== "failed" && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#006EDB]" />
                    )}
                    {getStatusDisplayName(connection.status)}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <ManageConnectionMenu id={connection.id} tenant={tenant} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
