import { requireSession } from "@/lib/server-utils";
import { getTenantByUserId } from "@/lib/service";

import { AppLocation } from "./footer";
import Main from "./main";
import Welcome from "./welcome";

export default async function Home() {
  const session = await requireSession();
  const tenant = await getTenantByUserId(session.user.id);

  return (
    <Main name={session.user.name} appLocation={AppLocation.CHAT}>
      <Welcome tenant={tenant} className="flex-1 flex flex-col w-full bg-white p-4 max-w-[717px]" />
    </Main>
  );
}
