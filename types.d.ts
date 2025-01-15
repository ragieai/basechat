import { AdapterUser } from "next-auth/adapters";
import { DefaultJWT, JWT } from "next-auth/jwt";

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT extends Record<string, unknown>, DefaultJWT {
    /** The user ID that is stored in the database */
    id: string;
  }
}
