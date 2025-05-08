import { getMembersByTenantId } from "@/lib/server/service";
import { adminOrRedirect } from "@/lib/server/utils";

import SettingsNav from "../settings-nav";

import UserSettings from "./user-settings";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SettingsUsersIndexPage({ params }: Props) {
  const p = await params;
  const { tenant } = await adminOrRedirect(p.slug);
  const { members, total } = await getMembersByTenantId(tenant.id, 1, 10);

  return (
    <div className="max-w-[1140px] w-full p-4 flex-grow flex">
      <SettingsNav tenant={tenant} />
      <UserSettings tenant={tenant} initialMembers={members} initialTotal={total} pageSize={10} />
    </div>
  );
}
