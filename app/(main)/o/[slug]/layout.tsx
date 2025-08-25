import { ReactNode } from "react";

import { PaymentRequiredDialog } from "@/components/payment-required-dialog";
import RagieLogo from "@/components/ragie-logo";
import { WelcomeDialog } from "@/components/welcome-dialog";
import { getUserById } from "@/lib/server/service";
import { BILLING_ENABLED } from "@/lib/server/settings";
import { authOrRedirect } from "@/lib/server/utils";

import Footer from "./footer";
import Header from "./header";

interface Props {
  params: Promise<{ slug: string }>;
  children?: ReactNode;
}

export default async function MainLayout({ children, params }: Props) {
  const { slug } = await params;
  const { tenant, profile, session } = await authOrRedirect(slug);
  const user = await getUserById(session.user.id);

  const displayWelcome = !user.completedWelcomeFlowAt && profile.role == "admin";

  return (
    <div className="h-screen w-full flex flex-col items-center bg-white overflow-hidden">
      <Header
        isAnonymous={user.isAnonymous}
        tenant={tenant}
        name={session.user.name}
        email={user.email}
        role={profile.role}
        billingEnabled={BILLING_ENABLED}
      />
      <main className="flex-1 w-full overflow-y-auto">{children}</main>
      {profile.role == "admin" && (
        <Footer
          tenant={tenant}
          className="h-[80px] shrink-0 w-full bg-white border-t border-gray-200 flex items-center justify-center"
        />
      )}
      {profile.role == "guest" && (
        <div className="h-20 shrink-0 w-full bg-[#27272A] flex items-center justify-center">
          <div className={`mr-2.5 text-md text-[#FEFEFE]`}>Powered by</div>
          <div>
            <a href="https://ragie.ai/?utm_source=oss-chatbot" target="_blank">
              <RagieLogo />
            </a>
          </div>
        </div>
      )}
      <PaymentRequiredDialog tenant={tenant} profile={profile} />
      {displayWelcome && <WelcomeDialog displayWelcome={displayWelcome} userId={user.id} />}
    </div>
  );
}
