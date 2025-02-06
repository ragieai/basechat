"use server";

import { z, ZodError } from "zod";

import { signIn } from "@/auth";
import db from "@/lib/server/db";
import * as schema from "@/lib/server/db/schema";
import { hashPassword } from "@/lib/server/utils";

import { extendPasswordSchema } from "../utils";

const registerSchema = extendPasswordSchema({
  firstName: z.string().trim().min(1, { message: "First name is required" }),
  lastName: z.string().trim().min(1, { message: "Last name is required" }),
  email: z.string().email().trim().min(1, { message: "Email is required" }),
  redirectTo: z.string().optional(),
});

type SignUpFormState = { error: string[] } | null;

export async function handleSignUp(prevState: SignUpFormState, formData: FormData): Promise<SignUpFormState> {
  let values;
  try {
    values = registerSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
      redirectTo: formData.get("redirectTo"),
    });
  } catch (e) {
    return { error: (e as ZodError).errors.map((error) => error.message) };
  }

  try {
    await db.insert(schema.users).values({
      name: values.firstName + " " + values.lastName,
      email: values.email,
      password: await hashPassword(values.password),
    });
  } catch (e) {
    if (!(e instanceof Error)) {
      throw e;
    }
    return {
      error: [e.message.indexOf("duplicate key") > -1 ? "Account already exists" : e.message],
    };
  }

  const redirectTo = values.redirectTo ? values.redirectTo.toString() : "/start";

  await signIn("credentials", {
    email: values.email,
    password: values.password,
    redirectTo,
  });

  return null;
}
