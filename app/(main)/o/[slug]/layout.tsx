import { ReactNode } from "react";

import { authOrRedirect } from "@/lib/server/utils";

import Footer from "./footer";
import Header from "./header";

interface Props {
  params: Promise<{ slug: string }>;
  children?: ReactNode;
}

export default async function MainLayout({ children, params }: Props) {
  const p = await params;
  const { tenant, profile, session } = await authOrRedirect(p.slug);

  return (
    <div className="h-full w-full flex flex-col items-center bg-white">
      <Header currentProfileId={profile.id} tenant={tenant} name={session.user.name} />
      <div className="h-full w-full flex-1 flex justify-center overflow-auto">
        <div className="h-full w-full flex flex-col items-center justify-center min-w-[500px]">{children}</div>
      </div>
      {profile.role != "user" && (
        <Footer tenant={tenant} className="h-[80px] shrink-0 w-full bg-[#27272A] flex items-center justify-center" />
      )}
    </div>
  );
}
