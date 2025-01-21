"use server";

import { redirect } from "next/navigation";
import { z, ZodError } from "zod";

import db from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { hashPassword } from "@/lib/server-utils";
import * as settings from "@/lib/settings";

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, { message: "First name is required" }),
    lastName: z.string().trim().min(1, { message: "Last name is required" }),
    email: z.string().email().trim().min(1, { message: "Email is required" }),
    password: z.string().min(6, { message: "Password is required and must be at least 6 characters" }),
    confirm: z.string(),
    redirectTo: z.string().optional(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
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

  const signInUrl = new URL("/signin", settings.BASE_URL);
  signInUrl.searchParams.set("registered", "1");
  if (values.redirectTo) {
    signInUrl.searchParams.set("redirectTo", values.redirectTo);
  }

  redirect(signInUrl.toString());
}
