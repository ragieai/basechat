import { requireSession } from "@/lib/server-utils";
import { getTenantByUserId } from "@/lib/service";

import { AppLocation } from "../footer";
import Main from "../main";

export default async function DataIndexPage() {
  const session = await requireSession();
  const tenant = await getTenantByUserId(session.user.id);

  return (
    <Main name={session.user.name} appLocation={AppLocation.SETTINGS}>
      <div className="max-w-[1140px] w-full p-4 flex-grow flex flex-col">
        <div className="flex w-full justify-between items-center pt-2">
          <h1 className="font-bold text-[32px]">Settings</h1>
        </div>
      </div>
    </Main>
  );
}
