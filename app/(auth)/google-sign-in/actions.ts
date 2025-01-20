"use server";

import { signIn } from "@/auth";

export async function handleGoogleSignIn(formData: FormData) {
  const redirectTo = formData.get("redirectTo");
  const next = redirectTo ? redirectTo.toString() : "/start";
  await signIn("google", { redirectTo: next });
}
