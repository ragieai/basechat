import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getSignUpPath, getStartPath } from "@/lib/paths";
import { findUserById } from "@/lib/server/service";

export async function GET() {
  const session = await auth();

  if (session?.user.id) {
    const user = await findUserById(session.user.id);
    if (user?.isAnonymous) {
      return redirect(getSignUpPath());
    }
  }
  return redirect(getStartPath());
}
