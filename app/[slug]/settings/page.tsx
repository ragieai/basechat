import { redirect } from "next/navigation";

import GeneralSettings from "@/app/(main)/settings/general-settings";
import SettingsNav from "@/app/(main)/settings/settings-nav";
import { adminOrRedirect } from "@/lib/server/utils";

interface Props {
  params: { slug: string };
}

export default async function SettingsPage({ params }: Props) {
  const { tenant } = await adminOrRedirect();
  const canUploadLogo = !!process.env.STORAGE_ENDPOINT;
  const { slug } = await params;

  // Verify that the tenant slug matches the URL slug
  if (tenant.slug !== slug) {
    redirect("/sign-in");
  }

  return (
    <div className="flex justify-center overflow-auto w-full">
      <div className="max-w-[1140px] w-full p-4 flex-grow flex">
        <SettingsNav tenantSlug={tenant.slug} />
        <GeneralSettings tenant={tenant} canUploadLogo={canUploadLogo} />
      </div>
    </div>
  );
}
