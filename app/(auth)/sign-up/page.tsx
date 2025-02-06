import Link from "next/link";

import * as settings from "@/lib/server/settings";

import { Title } from "../common";
import GoogleSignIn from "../google-sign-in";

import SignUp from "./sign-up";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  const { redirectTo } = await searchParams;
  const signInUrl = new URL("/sign-in", settings.BASE_URL);
  if (redirectTo) {
    signInUrl.searchParams.set("redirectTo", redirectTo);
  }

  return (
    <>
      <Title className="mb-12">
        Welcome to {settings.APP_NAME}.<br />
        Sign up to build your chatbot.
      </Title>

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
        <Link href={signInUrl.toString()} className="text-[#1D1D1F] hover:underline">
          Sign in
        </Link>
      </div>
    </>
  );
}
