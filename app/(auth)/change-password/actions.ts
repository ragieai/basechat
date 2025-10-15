"use server";

import { redirect } from "next/navigation";
import { z, ZodError } from "zod/v3";

import auth from "@/auth";
import { getSignInPath } from "@/lib/paths";

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

  await auth.api.resetPassword({
    body: {
      token: data.token,
      newPassword: data.password,
    },
  });

  redirect(getSignInPath({ reset: true }));
}
