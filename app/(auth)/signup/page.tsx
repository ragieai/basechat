import Link from "next/link";

import * as settings from "@/lib/settings";

import GoogleSignIn from "../google-sign-in";

import { handleSignUp } from "./actions";

export default function SignUpPage() {
  return (
    <>
      <div className="self-start mb-12 text-[30px] font-bold">
        Welcome to {settings.APP_NAME}.<br />
        Sign up to build your chatbot.
      </div>

      <div className="flex flex-col items-center w-full">
        <GoogleSignIn redirectTo={""} />
      </div>

      <div className=" flex flex-col items-center mb-12 w-full relative">
        <hr className="w-full" />
        <div className="absolute top-[-24px] bg-white p-3 text-center text-[#74747A]">or</div>
      </div>

      <form className="flex flex-col w-full" action={handleSignUp}>
        <div className="flex justify-between gap-4">
          <input
            name="firstName"
            type="text"
            placeholder="First name"
            className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-4"
          />
          <input
            name="lastName"
            type="text"
            placeholder="Last name"
            className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-4"
          />
        </div>
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
          className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-4"
        />
        <input
          name="confirm"
          type="password"
          placeholder="Confirm password"
          className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-8"
        />
        <button className="text-md text-white text-[16px] font-semibold bg-[#D946EF] rounded-[54px] py-2 w-full">
          Sign up
        </button>
      </form>
      <div className="mt-6 text-[16px]">
        <span className="text-[#74747A]">Already using {settings.APP_NAME}?&nbsp;</span>
        <Link href="/signin" className="text-[#1D1D1F] hover:underline">
          Sign in
        </Link>
      </div>
    </>
  );
}
