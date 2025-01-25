"use client";

import { Button } from "../common";

export default function ChangePassword() {
  return (
    <>
      <form className="w-full mt-10">
        <input
          name="password"
          type="password"
          placeholder="New password"
          className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-4"
        />
        <input
          name="confirm"
          type="password"
          placeholder="Re-type password"
          className="w-full border rounded-[6px] text-[16px] placeholder-[#74747A] px-4 py-2 mb-6"
        />
        <Button className="mt-6">Submit</Button>
      </form>
    </>
  );
}
