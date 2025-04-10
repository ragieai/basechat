import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  boolean,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

import 'dotenv/config'


// run with: npm run something myEmail arg2
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL environment variable is required");

const db = drizzle(databaseUrl);

console.log(process.argv);

if (process.argv.length < 4) {
  console.log("You need two arguments");
  process.exit(1);
}

const email = process.argv[2];

// This is here because we don't import and build the files with typescript.
// We should do that, just need to set up a good way to do it.
const usersSchema = pgTable("users", {
  name: text("name"),
  email: text("email").unique(),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image")
});

console.log("My very own command with argument:", process.argv[0], process.argv[1]);

(async () => {
  const users = await db.select().from(usersSchema).where(eq(usersSchema.email, email));
  for (const user of users) {
    console.log(user);
  }

  process.exit(0);
})();
