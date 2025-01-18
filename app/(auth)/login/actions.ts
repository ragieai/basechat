"use server";

import { signIn } from "@/auth";

interface LoginFormState {
  error?: string;
}

export async function formLogin(prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (e) {
    return { error: "Bad email or password" };
  }
  return {};
}
