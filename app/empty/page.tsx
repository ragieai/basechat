import { Inter } from "next/font/google";

import { requireSession } from "@/lib/server/utils";

import EmptyForm from "./empty-form";

const inter = Inter({ subsets: ["latin"] });

export default async function EmptyPage() {
  const session = await requireSession();
  return (
    <main className={`flex flex-col min-h-screen p-6 pt-4 justify-center items-center ${inter.className} bg-white`}>
      <div className="w-[800px]">
        <EmptyForm />
      </div>
    </main>
  );
}
