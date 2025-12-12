import { anonymousClient, jwtClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [anonymousClient(), jwtClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
