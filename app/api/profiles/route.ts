import { NextRequest } from "next/server";

import { updateCurrentProfileSchema } from "@/lib/schema";
import { requireSession } from "@/lib/server/server-utils";
import { setCurrentProfileId } from "@/lib/server/service";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  const json = await request.json();
  const payload = updateCurrentProfileSchema.parse(json);

  await setCurrentProfileId(session.user.id, payload.currentProfileId);

  return new Response(null, { status: 200 });
}
