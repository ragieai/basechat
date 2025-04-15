"use client";

import { useRouter } from "next/navigation";

export default function EmptyForm() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center w-full">
      <p className="text-center text-[40px] font-bold leading-[120%] mb-8 w-full">
        You don&apos;t have a chatbot right now.
        <br />
        Let&apos;s get you started on your next one.
      </p>
      <button
        onClick={() => router.push("/setup")}
        className="bg-[#D946EF] font-semibold text-white flex justify-center items-center w-[201px] h-[38px] gap-2 rounded-[54px] py-[10px] px-[24px]"
      >
        Build a new chatbot
      </button>
    </div>
  );
}
