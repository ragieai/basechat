import { ReactNode } from "react";

import { authOrRedirect } from "@/lib/server/utils";

import Footer from "./footer";
import Header from "./header";

interface Props {
  children?: ReactNode;
}

export default async function AppLayout({ children }: Props) {
  const { tenant } = await authOrRedirect();

  return (
    <div className="h-full w-full flex flex-col items-center bg-white">
      <Header currentTenantId={tenant.id} name={tenant.name} />
      <div className="h-full w-full flex-1 flex justify-center overflow-auto">
        <div className="h-full w-full flex flex-col items-center justify-center min-w-[500px]">{children}</div>
      </div>
      <Footer className="h-[80px] shrink-0 w-full bg-[#27272A] flex items-center justify-center" />
    </div>
  );
}
