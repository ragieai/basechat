"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import db from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { hashPassword } from "@/lib/server-utils";

const registerSchema = z
  .object({
    firstName: z.string().trim(),
    lastName: z.string().trim(),
    email: z.string().email().trim(),
    password: z.string(),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

export async function handleSignUp(formData: FormData) {
  const values = registerSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  await db.insert(schema.users).values({
    name: values.firstName + " " + values.lastName,
    email: values.email,
    password: await hashPassword(values.password),
  });

  redirect("/");
}
