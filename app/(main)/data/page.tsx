import { formatDistanceToNow } from "date-fns";
import { eq } from "drizzle-orm";
import Image from "next/image";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import db from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { authOrRedirect } from "@/lib/server-utils";

import CONNECTOR_MAP from "../../../lib/connector-map";
import ManageDataPreviewIcons from "../../../public/manage-data-preview-icons.svg";
import { AppLocation } from "../footer";
import Main from "../main";

import AddConnectionMenu from "./add-connection-menu";
import ManageConnectionMenu from "./manage-connection-menu";

export default async function DataIndexPage() {
  const { tenant, session } = await authOrRedirect();
  const connections = await db.select().from(schema.connections).where(eq(schema.connections.tenantId, tenant.id));

  return (
    <Main currentTenantId={tenant.id} name={session.user.name} appLocation={AppLocation.DATA}>
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
    </Main>
  );
}
