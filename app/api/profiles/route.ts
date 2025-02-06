import { NextRequest } from "next/server";

import { updateCurrentProfileSchema } from "@/lib/api";
import { setCurrentProfileId } from "@/lib/server/service";
import { requireSession } from "@/lib/server/utils";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  const json = await request.json();
  const payload = updateCurrentProfileSchema.parse(json);

  await setCurrentProfileId(session.user.id, payload.currentProfileId);

  return new Response(null, { status: 200 });
}
