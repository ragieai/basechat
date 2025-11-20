"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WarningMessage from "@/components/warning-message";
import { getPricingPlansPath } from "@/lib/paths";
import * as schema from "@/lib/server/db/schema";
import ManageDataPreviewIcons from "@/public/manage-data-preview-icons.svg";

import AddConnectionMenu from "./add-connection-menu";
import ConnectionsTable from "./connections-table";
import FileDropzone from "./file-dropzone";
import FilesTable from "./files-table";
import UploadFileButton from "./upload-file-button";

interface Props {
  tenant: {
    id: string;
    slug: string;
    partitionLimitExceededAt: Date | null;
    paidStatus: string;
  };
  session: {
    user: {
      name: string;
    };
  };
  initialFiles: any[];
  nextCursor: string | null;
  totalDocuments: number;
  connections: (typeof schema.connections.$inferSelect)[];
  connectionMap: Record<
    string,
    {
      sourceType: string;
      addedBy: string | null;
    }
  >;
  defaultPartitionLimit: number;
}

export default function DataPageClient({
  tenant,
  session,
  initialFiles,
  nextCursor,
  totalDocuments,
  connections,
  connectionMap,
  defaultPartitionLimit,
}: Props) {
  const [fileUploadCount, setFileUploadCount] = useState(0);

  const chatbotDisabled = tenant.paidStatus === "expired";

  return (
    <div className="max-w-[1140px] w-full p-4 flex flex-col h-full">
      <div className="flex w-full justify-between items-center pt-2">
        <h1 className="font-bold text-[32px] text-[#343A40]">Chatbot data</h1>
        <div className="flex gap-2">
          <UploadFileButton
            tenant={tenant}
            userName={session.user.name}
            onUploadComplete={() => setFileUploadCount((prev) => prev + 1)}
            disabled={chatbotDisabled}
          />
          <AddConnectionMenu tenant={tenant} disabled={chatbotDisabled} />
        </div>
      </div>
      {!isNaN(defaultPartitionLimit) && tenant.partitionLimitExceededAt && (
        <WarningMessage className="mt-4">
          You have reached the page processing limit for this chatbot. Please{" "}
          <Link href={getPricingPlansPath(tenant.slug)} className={"underline"}>
            upgrade plans
          </Link>{" "}
          to continue or contact support@ragie.ai if you need assistance.
        </WarningMessage>
      )}
      <Tabs defaultValue="files" className="flex flex-col h-full mt-8">
        <TabsList className="w-full justify-start bg-transparent gap-2">
          <TabsTrigger
            value="files"
            className="text-sm font-medium text-[#1D1D1F] data-[state=active]:bg-[#27272A] data-[state=active]:text-white data-[state=active]:rounded-[32px] data-[state=active]:w-[55px] data-[state=active]:h-[36px] data-[state=active]:py-[8px] data-[state=active]:px-[12px] data-[state=active]:shadow-none"
          >
            Files
          </TabsTrigger>
          <TabsTrigger
            value="connections"
            className="text-sm font-medium text-[#1D1D1F] data-[state=active]:bg-[#27272A] data-[state=active]:text-white data-[state=active]:rounded-[32px] data-[state=active]:w-[109px] data-[state=active]:h-[36px] data-[state=active]:py-[8px] data-[state=active]:px-[12px] data-[state=active]:shadow-none"
          >
            Connections
          </TabsTrigger>
        </TabsList>
        <TabsContent value="files" className="flex-1 overflow-hidden">
          {initialFiles.length > 0 ? (
            <FilesTable
              tenant={tenant}
              initialFiles={initialFiles}
              nextCursor={nextCursor}
              initialTotalDocuments={totalDocuments}
              userName={session.user.name}
              connectionMap={connectionMap}
              fileUploadCount={fileUploadCount}
            />
          ) : (
            <div className="flex-grow w-full flex flex-col items-center justify-center h-[calc(100vh-400px)]">
              <FileDropzone
                tenant={tenant}
                userName={session.user.name}
                onUploadComplete={() => setFileUploadCount((prev) => prev + 1)}
              />
            </div>
          )}
        </TabsContent>
        <TabsContent value="connections" className="flex-1 overflow-hidden">
          {connections.length > 0 ? (
            <ConnectionsTable tenant={tenant} connections={connections} />
          ) : (
            <div className="flex-grow w-full flex flex-col items-center justify-center h-[calc(100vh-400px)]">
              <Image alt="Manage data" src={ManageDataPreviewIcons} />
              <h1 className="font-bold text-[32px] mb-3">Add a connection</h1>
              <div className="text-[16px]">Click &apos;Add Connection&apos; above to get started</div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
