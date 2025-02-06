import Link from "next/link";

import * as settings from "@/lib/server/settings";

import { Title } from "../common";
import GoogleSignIn from "../google-sign-in";

import SignIn from "./sign-in";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  const { redirectTo } = await searchParams;
  const signUpUrl = new URL("/sign-up", settings.BASE_URL);
  if (redirectTo) {
    signUpUrl.searchParams.set("redirectTo", redirectTo);
  }

  return (
    <>
      <Title className="mb-12">
        Welcome back.
        <br />
        Log in to your account below.
      </Title>

      <div className="flex flex-col items-center w-full">
        <GoogleSignIn redirectTo={redirectTo} />
      </div>

      <div className=" flex flex-col items-center mb-12 w-full relative">
        <hr className="w-full" />
        <div className="absolute top-[-24px] bg-white p-3 text-center text-[#74747A]">or</div>
      </div>

      <SignIn redirectTo={redirectTo} />

      <Link href="/reset" className="text-[#D946EF] text-[16px] mt-6 hover:underline">
        Forgot password?
      </Link>

      <div className="mt-6 text-[16px]">
        <span className="text-[#74747A]">Need to create a new organization?&nbsp;</span>
        <Link href={signUpUrl.toString()} className="text-[#D946EF] hover:underline">
          Sign up
        </Link>
      </div>
    </>
  );
}
