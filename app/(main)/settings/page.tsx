import { requireSession } from "@/lib/server-utils";
import { getTenantByUserId } from "@/lib/service";

import { AppLocation } from "../footer";
import Main from "../main";

import GeneralSettings from "./general-settings";
import SettingsNav from "./settings-nav";

export default async function DataIndexPage() {
  const session = await requireSession();
  const tenant = await getTenantByUserId(session.user.id);

  return (
    <Main name={session.user.name} appLocation={AppLocation.SETTINGS}>
      <div className="max-w-[1140px] w-full p-4 flex-grow flex">
        <SettingsNav appLocation={AppLocation.SETTINGS} />
        <GeneralSettings tenant={tenant} />
      </div>
    </Main>
  );
}
