"use server";

import { z } from "zod";

import { sendResetPasswordVerification } from "@/lib/service";

interface ResetFormState {
  error?: string;
}

export async function handleResetPassword(prevState: ResetFormState, formData: FormData): Promise<ResetFormState> {
  const email = z.string().email().parse(formData.get("email"));
  await sendResetPasswordVerification(email);
  return {};
}
