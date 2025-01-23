import { authOrRedirect } from "@/lib/server-utils";
import { getMembersByTenantId } from "@/lib/service";

import { AppLocation } from "../../footer";
import Main from "../../main";
import SettingsNav from "../settings-nav";

import UserSettings from "./user-settings";

export const dynamic = "force-dynamic";

export default async function UsersIndexPage() {
  const { session, tenant } = await authOrRedirect(undefined);
  const members = await getMembersByTenantId(tenant.id);

  return (
    <Main currentTenantId={tenant.id} name={session.user.name} appLocation={AppLocation.SETTINGS}>
      <div className="max-w-[1140px] w-full p-4 flex-grow flex">
        <SettingsNav appLocation={AppLocation.SETTINGS_USERS} />
        <UserSettings members={members} />
      </div>
    </Main>
  );
}
