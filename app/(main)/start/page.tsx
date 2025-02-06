import { redirect } from "next/navigation";

import { getFirstTenantByUserId } from "@/lib/server/service";
import { requireSession } from "@/lib/server/utils";

export default async function StartPage() {
  const session = await requireSession();

  let tenantId: string | undefined;

  const tenant = await getFirstTenantByUserId(session.user.id);
  tenantId = tenant?.id;

  if (!tenantId) {
    redirect("/setup");
  } else {
    redirect("/");
  }
}
