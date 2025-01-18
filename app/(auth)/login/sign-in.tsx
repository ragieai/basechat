"use client";

import { Roboto } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";

import { cn } from "@/lib/utils";

import GoogleMarkSVG from "../../../public/google-mark.svg";

import { formLogin, googleLogin } from "./actions";

const roboto = Roboto({ subsets: ["latin"], weight: "400" });

export default function SignIn({ className, redirectTo }: { redirectTo?: string; className?: string }) {
  const [{ error }, loginFormAction, pending] = useActionState(formLogin, {});

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <form className="mb-8 w-full" action={googleLogin}>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button
          type="submit"
          className="flex bg-[#F2F2F2] py-2.5 px-3 rounded-[48px] w-full justify-center items-center"
        >
          <Image src={GoogleMarkSVG} alt="Continue with Google" />
          <div className={`ml-2.5 text-md drop-shadow-md ${roboto.className}`}>Continue with Google</div>
        </button>
      </form>

      <div className=" flex flex-col items-center mb-12 w-full relative">
        <hr className="w-full" />
        <div className="absolute top-[-24px] bg-white p-3 text-center text-[#74747A]">or</div>
      </div>

      <form className="flex flex-col w-full" action={loginFormAction}>
        {error && <div className="text-red-500 text-center mb-4">Login failed: {error}</div>}
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
        <button className="text-md text-white text-[16px] font-semibold bg-[#D946EF] rounded-[54px] py-2 w-full">
          Sign in
        </button>
      </form>

      <div className="mt-6 text-[16px]">
        <span className="text-[#74747A]">Need to create a new organization?&nbsp;</span>
        <Link href="" className="text-[#1D1D1F] hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
