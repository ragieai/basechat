import Link from "next/link";

import { requireSession } from "@/lib/server-utils";
import { getProfilesByTenantId, getTenantByUserId } from "@/lib/service";

import { AppLocation } from "../../footer";
import Main from "../../main";
import SettingsNav from "../settings-nav";

import UserSettings from "./user-settings";

export default async function DataIndexPage() {
  const session = await requireSession();
  const tenant = await getTenantByUserId(session.user.id);
  const profiles = await getProfilesByTenantId(tenant.id);

  return (
    <Main name={session.user.name} appLocation={AppLocation.SETTINGS}>
      <div className="max-w-[1140px] w-full p-4 flex-grow flex">
        <SettingsNav appLocation={AppLocation.SETTINGS_USERS} />
        <UserSettings profiles={profiles} />
      </div>
    </Main>
  );
}
