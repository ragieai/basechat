import { adminOrRedirect } from "@/lib/server/utils";

import { AppLocation } from "../footer";
import Main from "../main";

import GeneralSettings from "./general-settings";
import SettingsNav from "./settings-nav";

export default async function SettingsIndexPage() {
  const { tenant, session } = await adminOrRedirect();

  return (
    <Main currentTenantId={tenant.id} name={session.user.name} appLocation={AppLocation.SETTINGS}>
      <div className="max-w-[1140px] w-full p-4 flex-grow flex">
        <SettingsNav appLocation={AppLocation.SETTINGS} />
        <GeneralSettings tenant={tenant} />
      </div>
    </Main>
  );
}
