import { getMembersByTenantId } from "@/lib/server/service";
import { adminOrRedirect } from "@/lib/server/utils";

import SettingsNav from "../settings-nav";

import UserSettings from "./user-settings";

export default async function SettingsUsersIndexPage() {
  const { tenant } = await adminOrRedirect();
  const members = await getMembersByTenantId(tenant.id);

  return (
    <div className="max-w-[1140px] w-full p-4 flex-grow flex">
      <SettingsNav />
      <UserSettings members={members} />
    </div>
  );
}
