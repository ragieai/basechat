import { redirect } from "next/navigation";
import { ReactNode } from "react";

import Header from "@/app/(main)/o/[slug]/header";
import RagieLogo from "@/components/ragie-logo";
import { getShareData, getUserById } from "@/lib/server/service";
import { getSession } from "@/lib/server/utils";

interface Props {
  params: Promise<{ shareId: string }>;
  children?: ReactNode;
}

export default async function SharedLayout({ children, params }: Props) {
  const { shareId } = await params;
  const session = await getSession();

  // can show logged in users a proper header if they are logged in, but it is not required
  let user = null;
  if (session) {
    user = await getUserById(session.user.id);
  }

  const shareData = await getShareData(shareId);
  if (!shareData) {
    redirect("/sign-in");
  }
  const { formattedTenant } = shareData;

  return (
    <div className="h-screen w-full flex flex-col items-center bg-white overflow-hidden">
      <Header
        isAnonymous={!user}
        tenant={formattedTenant}
        name={session?.user.name}
        email={session?.user.email}
        isLoggedIn={!!session}
      />
      <main className="flex-1 w-full overflow-y-auto">
        <div className="w-full max-w-[717px] lg:max-w-full px-4 mx-auto h-full flex flex-col items-center justify-center">
          {children}
        </div>
      </main>

      <div className="h-20 shrink-0 w-full bg-[#27272A] flex items-center justify-center">
        <div className={`mr-2.5 text-md text-[#FEFEFE]`}>Powered by</div>
        <div>
          <a href="https://ragie.ai/?utm_source=oss-chatbot">
            <RagieLogo />
          </a>
        </div>
      </div>
    </div>
  );
}
