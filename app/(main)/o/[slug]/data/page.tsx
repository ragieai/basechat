import { eq } from "drizzle-orm";
import Image from "next/image";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { getRagieClientAndPartition } from "@/lib/server/ragie";
import { adminOrRedirect } from "@/lib/server/utils";
import ManageDataPreviewIcons from "@/public/manage-data-preview-icons.svg";

import AddConnectionMenu from "./add-connection-menu";
import ConnectionsTable from "./connections-table";
import FileDropzone from "./file-dropzone";
import FilesTable from "./files-table";
import UploadFileButton from "./upload-file-button";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DataIndexPage({ params }: Props) {
  const p = await params;
  const { tenant, session } = await adminOrRedirect(p.slug);
  const connections = await db.select().from(schema.connections).where(eq(schema.connections.tenantId, tenant.id));

  // Create a map of source types to connections for quick lookup
  const connectionMap = connections.reduce(
    (acc, connection) => {
      acc[connection.sourceType] = connection;
      return acc;
    },
    {} as Record<string, (typeof connections)[0]>,
  );

  let files: any[] = [];
  let nextCursor: string | null = null;
  try {
    const { client, partition } = await getRagieClientAndPartition(tenant.id);
    const res = await client.documents.list({
      partition: partition || "",
      pageSize: 12,
    });
    files = res.result.documents;
    nextCursor = res.result.pagination.nextCursor || null;
  } catch (error) {
    console.error("Error fetching documents:", error);
  }

  return (
    <div className="max-w-[1140px] w-full p-4 flex flex-col h-full">
      <div className="flex w-full justify-between items-center pt-2">
        <h1 className="font-bold text-[32px] text-[#343A40]">Chatbot data</h1>
        <div className="flex gap-2">
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
