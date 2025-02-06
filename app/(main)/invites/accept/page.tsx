import assert from "assert";

import { redirect } from "next/navigation";

import { acceptInvite, setCurrentProfileId } from "@/lib/server/service";
import { requireSession } from "@/lib/server/utils";

interface Props {
  searchParams: Promise<{ invite?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: Props) {
  const session = await requireSession();
  const params = await searchParams;

  assert(params.invite, "Bad request");

  let acceptError;
  try {
    const profile = await acceptInvite(session.user.id, params.invite);
    await setCurrentProfileId(session.user.id, profile.id);
  } catch (e) {
    acceptError = e;
  }

  if (!acceptError) {
    redirect("/");
  }

  return (
    <div className="h-full w-full flex flex-col justify-center items-center bg-white">
      <p>Could not process invite.</p>
    </div>
  );
}
