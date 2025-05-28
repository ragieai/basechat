import assert from "assert";

import { redirect } from "next/navigation";

import { acceptInvite, findInviteById, setCurrentProfileId } from "@/lib/server/service";
import { requireSession } from "@/lib/server/utils";

interface Props {
  searchParams: Promise<{ invite?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: Props) {
  const session = await requireSession();
  const params = await searchParams;

  assert(params.invite, "Bad request");

  const invite = await findInviteById(params.invite);
  if (!invite) {
    return (
      <div className="h-full w-full flex flex-col justify-center items-center bg-white">
        <p>Could not find invite.</p>
      </div>
    );
  }

  try {
    const profile = await acceptInvite(session.user.id, params.invite);
    await setCurrentProfileId(session.user.id, profile.id);
    redirect("/");
  } catch (e) {
    // NEXT_REDIRECT is thrown by redirect("/") and should be rethrown
    if (e instanceof Error && e.message === "NEXT_REDIRECT") {
      throw e;
    } else {
      // some other error occurred
      console.error(e);
    }
  }

  return (
    <div className="h-full w-full flex flex-col justify-center items-center bg-white">
      <p>Could not process invite.</p>
    </div>
  );
}
