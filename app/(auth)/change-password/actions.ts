"use server";

import jwt from "jsonwebtoken";
import { z, ZodError } from "zod";

import { signIn } from "@/auth";
import { changePassword } from "@/lib/service";
import * as settings from "@/lib/settings";

import { extendPasswordSchema } from "../utils";

interface ChangePasswordFormState {
  error?: string[];
}

const changePasswordSchema = extendPasswordSchema({
  token: z.string(),
});

const verificationTokenSchema = z.object({
  sub: z.string().email(),
});

export async function handleChangePassword(
  prevState: ChangePasswordFormState,
  formData: FormData,
): Promise<ChangePasswordFormState> {
  let data;
  try {
    data = changePasswordSchema.parse({
      token: formData.get("token"),
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });
  } catch (e) {
    if (!(e instanceof ZodError)) throw e;
    return { error: e.errors.map((error) => error.message) };
  }

  let payload;
  try {
    payload = jwt.verify(data.token, settings.AUTH_SECRET);
  } catch (e) {
    return { error: ["Reset expired. Please try resetting your password again."] };
  }

  const token = verificationTokenSchema.parse(payload);

  await changePassword(token.sub, data.password);

  await signIn("credentials", {
    email: token.sub,
    password: data.password,
    redirectTo: "/",
  });

  return {};
}
