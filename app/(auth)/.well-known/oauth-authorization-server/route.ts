import { oAuthDiscoveryMetadata } from "better-auth/plugins";

import auth from "../../../../auth";

export async function handler(req: Request) {
  return await oAuthDiscoveryMetadata(auth)(req);
}

export { handler as GET, handler as OPTIONS };
