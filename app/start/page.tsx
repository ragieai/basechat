import { redirect } from "next/navigation";

import { getTenantPath } from "@/lib/paths";
import { getFirstTenantByUserId } from "@/lib/server/service";
import { requireSession } from "@/lib/server/utils";

export default async function StartPage() {
  const session = await requireSession();
  const tenant = await getFirstTenantByUserId(session.user.id);

  if (!tenant) {
    redirect("/setup");
  } else {
    redirect(getTenantPath(tenant.slug));
  }
}
