"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button, Error } from "../common";

import { handleResetPassword } from "./actions";

export default function Reset() {
  const [state, resetPasswordAction, pending] = useActionState(handleResetPassword, {});

  useEffect(() => {
    if (state.email) {
      toast.info(`Email sent to ${state.email}`);
    }
  }, [state.email]);

  return (
    <form className="flex flex-col w-full" action={resetPasswordAction}>
      <Error error={state.error} />
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
