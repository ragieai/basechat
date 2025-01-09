import Link from "next/link";

import { requireSession } from "@/lib/server-utils";
import { getTenantByUserId } from "@/lib/service";

import { AppLocation } from "../footer";
import Main from "../main";

export default async function DataIndexPage() {
  const session = await requireSession();
  const tenant = await getTenantByUserId(session.user.id);

  return (
    <Main name={session.user.name} appLocation={AppLocation.SETTINGS}>
      <div className="max-w-[1140px] w-full p-4 flex-grow flex">
        <div className="w-[233px] flex flex-col pr-16">
          <div className="bg-[#F5F5F7] px-3 py-2 rounded-lg font-semibold">
            <Link href="/settings">General</Link>
          </div>
          <div className="px-3 py-2">
            <Link href="/settings/users">Users</Link>
          </div>
        </div>
        <div className="w-full p-4 flex-grow flex flex-col">
          <div className="flex w-full justify-between items-center pt-2">
            <h1 className="font-bold text-[32px]">Settings</h1>
          </div>
          <div className="mt-16">
            <h3 className="font-semibold text-[16px]">Add sample questions to help your users get started</h3>
            <div className="flex flex-col mt-8">
              <label className="font-semibold text-[16px] mb-3">Question 1</label>
              <input
                type="text"
                className="rounded-[8px] border border-[#D7D7D7] p-4 placeholder-[#74747A] text-[16px]"
                placeholder="Type something"
              />
            </div>
            <div className="flex flex-col mt-8">
              <label className="font-semibold text-[16px] mb-3">Question 2</label>
              <input
                type="text"
                className="rounded-[8px] border border-[#D7D7D7] p-4 placeholder-[#74747A] text-[16px]"
                placeholder="Type something"
              />
            </div>
            <div className="flex flex-col mt-8">
              <label className="font-semibold text-[16px] mb-3">Question 3</label>
              <input
                type="text"
                className="rounded-[8px] border border-[#D7D7D7] p-4 placeholder-[#74747A] text-[16px]"
                placeholder="Type something"
              />
            </div>
          </div>
        </div>
      </div>
    </Main>
  );
}
