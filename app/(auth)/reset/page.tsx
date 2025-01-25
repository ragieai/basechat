import Link from "next/link";

import { Title } from "../common";

import Reset from "./reset";

export default function ResetPage() {
  return (
    <>
      <Title>Reset your password</Title>

      <div className="mt-6 text-[16px] mb-7">
        Enter the email address associated with your account. If you have an account, we’ll send a reset link to your
        email.
      </div>

      <Reset />

      <Link href="/signin" className="mt-6 text-[16px] text-[#74747A] hover:underline">
        Back to sign in
      </Link>
    </>
  );
}
