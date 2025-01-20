"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";

import { signIn } from "@/auth";

interface LoginFormState {
  error?: string;
}

export async function handleLogin(prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const redirectTo = formData.get("redirectTo");
  const next = redirectTo ? redirectTo.toString() : "/start";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: next,
    });
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { error: "Bad email or password" };
  }
  return {};
}
