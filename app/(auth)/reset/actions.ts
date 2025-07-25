"use server";

import { z, ZodError } from "zod";

import auth from "@/auth";
import { getChangePasswordPath } from "@/lib/paths";
import { findUserByEmail } from "@/lib/server/service";

interface ResetFormState {
  error?: string[];
  email?: string;
}

export async function handleResetPassword(prevState: ResetFormState, formData: FormData): Promise<ResetFormState> {
  let email;
  try {
    email = z.string().email().parse(formData.get("email"));
  } catch (e) {
    if (!(e instanceof ZodError)) throw e;
    return { error: e.errors.map((e) => e.message) };
  }

  try {
    // First check if user exists
    const user = await findUserByEmail(email);
    if (!user) {
      return {
        error: ["No account found with this email address"],
      };
    }

    await auth.api.forgetPassword({
      body: {
        email,
        redirectTo: getChangePasswordPath(),
      },
    });
    return { email };
  } catch (error) {
    return {
      error: ["An error occurred while processing your request"],
    };
  }
}
