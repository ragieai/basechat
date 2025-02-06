import { Inter } from "next/font/google";

import { requireSession } from "@/lib/server/utils";

import SetupForm from "./setup-form";

const inter = Inter({ subsets: ["latin"] });

export default async function SetupPage() {
  const session = await requireSession();

  return (
    <main className={`flex flex-col min-h-screen p-6 pt-4 justify-center items-center ${inter.className} bg-white`}>
      <div className="w-[442px]">
        <h3 className="text-[24px] font-bold mb-4">Welcome, {session.user.name}!</h3>
        <h2 className="mb-12 text-[52px] font-bold leading-[50px]">Just a few more details below.</h2>
        <SetupForm />
      </div>
    </main>
  );
}
