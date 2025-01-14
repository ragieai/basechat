import Link from "next/link";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/server-utils";
import { acceptInvite, isSetupComplete } from "@/lib/service";

interface Props {
  searchParams: Promise<{ invite?: string }>;
}

export default async function StartPage({ searchParams }: Props) {
  const session = await requireSession();
  const params = await searchParams;

  if (params.invite) {
    let acceptError;
    try {
      await acceptInvite(session.user.id, params.invite);
    } catch (e) {
      acceptError = e;
    }
    if (acceptError) {
      return (
        <div className="h-full w-full flex flex-col justify-center items-center bg-white">
          <p>Could not process invite.</p>
        </div>
      );
    } else {
      redirect("/");
    }
  } else {
    const setup = await isSetupComplete(session.user.id);
    if (setup) {
      redirect("/");
    } else {
      redirect("/setup");
    }
  }
}
