import { Roboto } from "next/font/google";
import Link from "next/link";

import { signIn } from "@/auth";
import { cn } from "@/lib/utils";

const roboto = Roboto({ subsets: ["latin"], weight: "400" });

const GoogleMarkSVG = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <mask
      id="mask0_67_6970"
      style={{ maskType: "luminance" }}
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="20"
      height="20"
    >
      <path d="M20 0H0V20H20V0Z" fill="white" />
    </mask>
    <g mask="url(#mask0_67_6970)">
      <path
        d="M19.6 10.2273C19.6 9.51819 19.5364 8.83639 19.4182 8.18179H10V12.05H15.3818C15.15 13.3 14.4455 14.3591 13.3864 15.0682V17.5773H16.6182C18.5091 15.8364 19.6 13.2727 19.6 10.2273Z"
        fill="#4285F4"
      />
      <path
        d="M10 20C12.7 20 14.9636 19.1045 16.6181 17.5773L13.3863 15.0682C12.4909 15.6682 11.3454 16.0227 10 16.0227C7.3954 16.0227 5.1909 14.2636 4.4045 11.9H1.0636V14.4909C2.7091 17.7591 6.0909 20 10 20Z"
        fill="#34A853"
      />
      <path
        d="M4.4045 11.9C4.2045 11.3 4.0909 10.6591 4.0909 9.99999C4.0909 9.34089 4.2045 8.69999 4.4045 8.09999V5.50909H1.0636C0.3864 6.85909 0 8.38639 0 9.99999C0 11.6136 0.3864 13.1409 1.0636 14.4909L4.4045 11.9Z"
        fill="#FBBC04"
      />
      <path
        d="M10 3.9773C11.4681 3.9773 12.7863 4.4818 13.8227 5.4727L16.6909 2.6045C14.9591 0.9909 12.6954 0 10 0C6.0909 0 2.7091 2.2409 1.0636 5.5091L4.4045 8.1C5.1909 5.7364 7.3954 3.9773 10 3.9773Z"
        fill="#E94235"
      />
    </g>
  </svg>
);

export default function SignIn({ className, redirectTo }: { redirectTo?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <form
        className="mb-8 w-full"
        action={async () => {
          "use server";
          const next = redirectTo ? redirectTo : "/start";
          await signIn("google", { redirectTo: next });
        }}
      >
        <button
          type="submit"
          className="flex bg-[#F2F2F2] py-2.5 px-3 rounded-[48px] w-full justify-center items-center"
        >
          <GoogleMarkSVG />
          <div className={`ml-2.5 text-md drop-shadow-md ${roboto.className}`}>Continue with Google</div>
        </button>
      </form>

      <div className=" flex flex-col items-center mb-12 w-full relative">
        <hr className="w-full" />
        <div className="absolute top-[-24px] bg-white p-3 text-center text-[#74747A]">or</div>
      </div>

      <form
        className="flex flex-col w-full"
        action={async (formData) => {
          "use server";
          console.log({ formData });
          await signIn("credentials", {
            email: formData.get("email"),
            password: formData.get("password"),
            redirectTo: "/",
          });
        }}
      >
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
