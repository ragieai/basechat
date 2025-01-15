import { redirect } from "next/navigation";

import { requireSession } from "@/lib/server-utils";
import { acceptInvite, getFirstTenantByUserId, setCurrentProfileId } from "@/lib/service";

interface Props {
  searchParams: Promise<{ invite?: string }>;
}

export default async function StartPage({ searchParams }: Props) {
  const session = await requireSession();
  const params = await searchParams;

  let tenantId: string | undefined;
  let acceptError;

  if (params.invite) {
    try {
      const profile = await acceptInvite(session.user.id, params.invite);
      await setCurrentProfileId(session.user.id, profile.id);

      tenantId = profile.tenantId;
    } catch (e) {
      acceptError = e;
    }
  } else {
    const tenant = await getFirstTenantByUserId(session.user.id);
    tenantId = tenant?.id;
  }

  if (!tenantId) {
    redirect("/setup");
  } else if (acceptError) {
    return (
      <div className="h-full w-full flex flex-col justify-center items-center bg-white">
        <p>Could not process invite.</p>
      </div>
    );
  } else {
    redirect("/");
  }
}
