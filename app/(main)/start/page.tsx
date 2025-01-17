import { redirect } from "next/navigation";

import { requireSession } from "@/lib/server-utils";
import { getFirstTenantByUserId } from "@/lib/service";

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
