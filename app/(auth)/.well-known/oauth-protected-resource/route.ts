import { oAuthProtectedResourceMetadata } from "better-auth/plugins";

import auth from "../../../../auth";

export async function handler(req: Request) {
  return await oAuthProtectedResourceMetadata(auth)(req);
}

export { handler as GET, handler as OPTIONS };
