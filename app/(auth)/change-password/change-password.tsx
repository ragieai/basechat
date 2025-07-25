"use client";

import { useActionState } from "react";

import { Button, Error } from "../common";

import { handleChangePassword } from "./actions";

interface Props {
  token: string;
}

export default function ChangePassword({ token }: Props) {
  const [{ error }, changePasswordAction, pending] = useActionState(handleChangePassword, {});
  return (
    <>
      <form className="w-full mt-10" action={changePasswordAction}>
        <Error error={error} />
        <input
          name="password"
          type="password"
          placeholder="New password"
          className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-4"
        />
        <input
          name="confirm"
          type="password"
          placeholder="Re-type password"
          className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-6"
        />
        <input type="hidden" name="token" value={token} />
        <Button className="mt-6" disabled={pending}>
          {pending ? "Updating..." : "Submit"}
        </Button>
      </form>
    </>
  );
}
