import { adminOrRedirect } from "@/lib/server/utils";

import GeneralSettings from "./general-settings";
import SettingsNav from "./settings-nav";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SettingsIndexPage({ params }: Props) {
  const p = await params;
  const { tenant } = await adminOrRedirect(p.slug);
  const canUploadLogo = !!process.env.STORAGE_ENDPOINT;

  return (
    <div className="flex justify-center overflow-auto w-full">
      <div className="max-w-[1140px] w-full p-4 flex-grow flex">
        <SettingsNav tenant={tenant} />
        <GeneralSettings tenant={tenant} canUploadLogo={canUploadLogo} />
      </div>
    </div>
  );
}
