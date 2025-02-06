import { drizzle } from "drizzle-orm/node-postgres";

import * as settings from "@/lib/server/settings";

export default drizzle(settings.DATABASE_URL);
