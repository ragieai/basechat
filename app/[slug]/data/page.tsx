import { formatDistanceToNow } from "date-fns";
import { eq } from "drizzle-orm";
import Image from "next/image";
import { redirect } from "next/navigation";

import AddConnectionMenu from "@/app/(main)/data/add-connection-menu";
import ManageConnectionMenu from "@/app/(main)/data/manage-connection-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CONNECTOR_MAP from "@/lib/connector-map";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { adminOrRedirect } from "@/lib/server/utils";
import ManageDataPreviewIcons from "@/public/manage-data-preview-icons.svg";

interface Props {
  params: { slug: string };
}

export default async function DataIndexPage({ params }: Props) {
  const { tenant } = await adminOrRedirect();
  const connections = await db.select().from(schema.connections).where(eq(schema.connections.tenantId, tenant.id));
  const { slug } = await params;

  // Verify that the tenant slug matches the URL slug
  if (tenant.slug !== slug) {
    redirect("/sign-in");
  }

  return (
    <div className="max-w-[1140px] w-full p-4 flex-grow flex flex-col">
      <div className="flex w-full justify-between items-center pt-2">
        <h1 className="font-bold text-[32px]">Manage data</h1>
        <AddConnectionMenu />
      </div>
      <>
        {connections.length > 0 ? (
          <div className="flex-grow w-full flex flex-col items-center mt-10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[200px]">Date added</TableHead>
                  <TableHead className="w-[50px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((connection) => (
                  <TableRow key={connection.id}>
                    <TableCell className="font-medium flex items-center">
                      <Image
                        src={CONNECTOR_MAP[connection.sourceType][1]}
                        alt={CONNECTOR_MAP[connection.sourceType][0]}
                        className="mr-1"
                      />
                      <div>{connection.name}</div>
                    </TableCell>
                    <TableCell>{formatDistanceToNow(connection.createdAt)}</TableCell>
                    <TableCell>{connection.status}</TableCell>
                    <TableCell className="text-right">
                      <ManageConnectionMenu id={connection.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex-grow w-full flex flex-col items-center justify-center">
            <Image alt="Manage data" src={ManageDataPreviewIcons} />
            <h1 className="font-bold text-[32px] mb-3">Chat with your own data</h1>
            <div className="text-[16px]">Click ‘Add data’ above to get started</div>
          </div>
        )}
      </>
    </div>
  );
}
