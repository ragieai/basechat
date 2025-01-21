import Link from "next/link";

import * as settings from "@/lib/settings";

import GoogleSignIn from "../google-sign-in";

import SignIn from "./sign-in";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: number; redirectTo?: string }>;
}) {
  const { registered, redirectTo } = await searchParams;
  const signUpUrl = new URL("/signup", settings.BASE_URL);
  if (redirectTo) {
    signUpUrl.searchParams.set("redirectTo", redirectTo);
  }

  return (
    <>
      <div className="self-start mb-12 text-[30px] font-bold">
        Welcome back.
        <br />
        Log in to your account below.
      </div>

      <div className="flex flex-col items-center w-full">
        <GoogleSignIn redirectTo={redirectTo} />
      </div>

      <div className=" flex flex-col items-center mb-12 w-full relative">
        <hr className="w-full" />
        <div className="absolute top-[-24px] bg-white p-3 text-center text-[#74747A]">or</div>
      </div>

      {registered && <div className="mb-6 text-green-600">Thank you for registering your account. Please sign in.</div>}

      <SignIn redirectTo={redirectTo} />

      <div className="mt-6 text-[16px]">
        <span className="text-[#74747A]">Need to create a new organization?&nbsp;</span>
        <Link href={signUpUrl.toString()} className="text-[#1D1D1F] hover:underline">
          Sign up
        </Link>
      </div>
    </>
  );
}
