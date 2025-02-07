import { getMembersByTenantId, getProfileByTenantIdAndUserId } from "@/lib/server/service";
import { adminOrRedirect } from "@/lib/server/utils";

import { AppLocation } from "../../footer";
import Main from "../../main";
import SettingsNav from "../settings-nav";

import UserSettings from "./user-settings";

export default async function UsersIndexPage() {
  const { session, tenant } = await adminOrRedirect();
  const members = await getMembersByTenantId(tenant.id);
  const { profiles } = await getProfileByTenantIdAndUserId(tenant.id, tenant.ownerId);

  return (
    <Main currentTenantId={tenant.id} name={session.user.name} appLocation={AppLocation.SETTINGS}>
      <div className="max-w-[1140px] w-full p-4 flex-grow flex">
        <SettingsNav appLocation={AppLocation.SETTINGS_USERS} />
        <UserSettings ownerProfileId={profiles.id} members={members} />
      </div>
    </Main>
  );
}
