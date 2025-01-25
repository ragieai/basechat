"use client";

import { useActionState } from "react";
import { toast } from "sonner";

import { Button } from "../common";

import { handleResetPassword } from "./actions";

export default function Reset() {
  const [{ error }, resetPasswordAction, pending] = useActionState(handleResetPassword, {});

  return (
    <form
      className="flex flex-col w-full"
      action={(formData) => {
        resetPasswordAction(formData);
        toast.info(`Email sent to ${formData.get("email")}`);
      }}
    >
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-6"
      />
      <Button>Send reset link</Button>
    </form>
  );
}
