import { requireAuthContext } from "@/lib/server-utils";

import { AppLocation } from "./footer";
import Main from "./main";
import Welcome from "./welcome";

export default async function Home() {
  const context = await requireAuthContext();

  return (
    <Main name={context.session.user.name} appLocation={AppLocation.CHAT}>
      <Welcome tenant={context.tenant} className="flex-1 flex flex-col w-full bg-white p-4 max-w-[717px]" />
    </Main>
  );
}
