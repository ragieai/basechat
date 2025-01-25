import Link from "next/link";

import { Button, Title } from "../common";

export default function ResetPage() {
  return (
    <>
      <Title>Reset your password</Title>

      <div className="mt-6 text-[16px] mb-6">
        Enter the email address associated with your account. If you have an account, we’ll send a reset link to your
        email.
      </div>

      <form className="flex flex-col w-full">
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-6"
        />
        <Button>Send reset link</Button>
      </form>

      <Link href="/signin" className="mt-6 text-[16px] text-[#74747A] hover:underline">
        Back to sign in
      </Link>
    </>
  );
}
