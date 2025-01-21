import Link from "next/link";
import { useActionState } from "react";

import * as settings from "@/lib/settings";

import GoogleSignIn from "../google-sign-in";

import SignUp from "./sign-up";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  const { redirectTo } = await searchParams;
  return (
    <>
      <div className="self-start mb-12 text-[30px] font-bold">
        Welcome to {settings.APP_NAME}.<br />
        Sign up to build your chatbot.
      </div>

      <div className="flex flex-col items-center w-full">
        <GoogleSignIn redirectTo={redirectTo} />
      </div>

      <div className=" flex flex-col items-center mb-12 w-full relative">
        <hr className="w-full" />
        <div className="absolute top-[-24px] bg-white p-3 text-center text-[#74747A]">or</div>
      </div>

      <SignUp redirectTo={redirectTo} />

      <div className="mt-6 text-[16px]">
        <span className="text-[#74747A]">Already using {settings.APP_NAME}?&nbsp;</span>
        <Link href="/signin" className="text-[#1D1D1F] hover:underline">
          Sign in
        </Link>
      </div>
    </>
  );
}
