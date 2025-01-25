"use client";

import { Roboto } from "next/font/google";
import { useActionState } from "react";

import { Button } from "../common";

import { handleSignIn } from "./actions";

const roboto = Roboto({ subsets: ["latin"], weight: "400" });

export default function SignIn({ redirectTo }: { redirectTo?: string }) {
  const [{ error }, signInAction, pending] = useActionState(handleSignIn, {});

  return (
    <form className="flex flex-col w-full" action={signInAction}>
      {error && <div className="text-red-500 text-center mb-4">{error}</div>}
      <input
        name="email"
        type="email"
        placeholder="Email"
        className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-4"
      />
      <input
        name="password"
        type="password"
        placeholder="Password"
        className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-8"
      />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <Button>Sign in</Button>
    </form>
  );
}
