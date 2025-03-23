import { redirect } from "next/navigation";

import SettingsNav from "@/app/(main)/settings/settings-nav";
import UserSettings from "@/app/(main)/settings/users/user-settings";
import { getMembersByTenantId } from "@/lib/server/service";
import { adminOrRedirect } from "@/lib/server/utils";

interface Props {
  params: { slug: string };
}

export default async function UsersSettingsPage({ params }: Props) {
  const { tenant } = await adminOrRedirect();
  const members = await getMembersByTenantId(tenant.id);
  const { slug } = await params;

  // Verify that the tenant slug matches the URL slug
  if (tenant.slug !== slug) {
    redirect("/sign-in");
  }

  return (
    <div className="max-w-[1140px] w-full p-4 flex-grow flex">
      <SettingsNav tenantSlug={tenant.slug} />
      <UserSettings members={members} />
    </div>
  );
}
