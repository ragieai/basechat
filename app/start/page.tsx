import { redirect } from "next/navigation";

import { getFirstTenantByUserId } from "@/lib/server/service";
import { requireSession } from "@/lib/server/utils";

export default async function StartPage() {
  const session = await requireSession();

  let tenantId: string | undefined;

  const tenant = await getFirstTenantByUserId(session.user.id);

  if (!tenant) {
    redirect("/setup");
  } else {
    redirect(`/${tenant.slug}`);
  }
}
