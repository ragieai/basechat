import Link from "next/link";

import { requireSession } from "@/lib/server-utils";
import { getTenantByUserId } from "@/lib/service";

import { AppLocation } from "../../footer";
import Main from "../../main";

import UserSettings from "./user-settings";

export default async function DataIndexPage() {
  const session = await requireSession();
  const tenant = await getTenantByUserId(session.user.id);

  return (
    <Main name={session.user.name} appLocation={AppLocation.SETTINGS}>
      <div className="max-w-[1140px] w-full p-4 flex-grow flex">
        <div className="w-[233px] flex flex-col pr-16">
          <div className="px-3 py-2">
            <Link href="/settings">General</Link>
          </div>
          <div className="bg-[#F5F5F7] px-3 py-2 rounded-lg font-semibold">
            <Link href="/settings/users">Users</Link>
          </div>
        </div>
        <UserSettings />
      </div>
    </Main>
  );
}
