"use client";

import Image from "next/image";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ManageDataPreviewIcons from "@/public/manage-data-preview-icons.svg";

import AddConnectionMenu from "./add-connection-menu";
import ConnectionsTable from "./connections-table";
import FileDropzone from "./file-dropzone";
import FileSearch from "./file-search";
import FilesTable from "./files-table";
import UploadFileButton from "./upload-file-button";

interface DataPageContentProps {
  tenant: {
    id: string;
    slug: string;
  };
  session: {
    user: {
      name: string | null;
    };
  };
  files: any[];
  nextCursor: string | null;
  connections: any[];
  connectionMap: Record<
    string,
    {
      sourceType: string;
      addedBy: string | null;
    }
  >;
}

export default function DataPageContent({
  tenant,
  session,
  files,
  nextCursor,
  connections,
  connectionMap,
}: DataPageContentProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="max-w-[1140px] w-full p-4 flex flex-col h-full">
      <div className="flex w-full justify-between items-center pt-2">
        <h1 className="font-bold text-[32px] text-[#343A40]">Chatbot data</h1>
        <div className="flex gap-2">
          <FileSearch onSearch={setSearchQuery} value={searchQuery} />
          <UploadFileButton tenant={tenant} userName={session.user.name} />
          <AddConnectionMenu tenant={tenant} />
        </div>
      </div>
      <Tabs defaultValue="files" className="flex flex-col h-full mt-8">
        <TabsList className="w-full justify-start bg-transparent gap-2">
          <TabsTrigger
            value="files"
            className="text-sm font-medium text-[#1D1D1F] data-[state=active]:bg-[#27272A] data-[state=active]:text-white data-[state=active]:rounded-[32px] data-[state=active]:w-[55px] data-[state=active]:h-[36px] data-[state=active]:py-[8px] data-[state=active]:px-[12px]"
          >
            Files
          </TabsTrigger>
          <TabsTrigger
            value="connections"
            className="text-sm font-medium text-[#1D1D1F] data-[state=active]:bg-[#27272A] data-[state=active]:text-white data-[state=active]:rounded-[32px] data-[state=active]:w-[109px] data-[state=active]:h-[36px] data-[state=active]:py-[8px] data-[state=active]:px-[12px]"
          >
            Connections
          </TabsTrigger>
        </TabsList>
        <TabsContent value="files" className="flex-1 overflow-hidden pb-8">
          {files.length > 0 ? (
            <FilesTable
              tenant={tenant}
              initialFiles={files}
              nextCursor={nextCursor}
              userName={session.user.name}
              connectionMap={connectionMap}
              searchQuery={searchQuery}
            />
          ) : (
            <div className="flex-grow w-full flex flex-col items-center justify-center h-[calc(100vh-400px)]">
              <FileDropzone tenant={tenant} userName={session.user.name} />
            </div>
          )}
        </TabsContent>
        <TabsContent value="connections" className="flex-1 overflow-hidden pb-8">
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
