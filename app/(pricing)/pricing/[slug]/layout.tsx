import { ReactNode } from "react";

import { getUserById } from "@/lib/server/service";
import { adminOrRedirect } from "@/lib/server/utils";

interface Props {
  params: Promise<{ slug: string }>;
  children?: ReactNode;
}

export default async function PricingLayout({ children, params }: Props) {
  const { slug } = await params;
  const { tenant, profile, session } = await adminOrRedirect(slug);
  const user = await getUserById(session.user.id);

  return (
    <div className="h-screen w-full flex flex-col items-center bg-white overflow-hidden">
      <main className="flex-1 w-full overflow-y-auto">
        <div className="w-full max-w-[717px] lg:max-w-full px-4 mx-auto h-full flex flex-col items-center justify-center">
          {children}
        </div>
      </main>
    </div>
  );
}
