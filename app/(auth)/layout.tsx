import { Inter, Inter_Tight } from "next/font/google";
import Image from "next/image";

import RagieLogo from "@/components/ragie-logo";
import * as settings from "@/lib/server/settings";

const inter_tight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({ subsets: ["latin"] });

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="h-screen w-full flex flex-col items-center bg-white overflow-hidden">
      <div className="flex-1 w-full overflow-y-auto">
        <div className="w-full max-w-[460px] px-4 mx-auto h-full flex flex-col items-center justify-center">
          <div className="flex items-center mb-16">
            <Image
              src="/title-logo.svg"
              alt={settings.APP_NAME}
              width={442}
              height={64}
              className="max-w-[442px] max-h-[64px] max-[460px]:max-w-[311px] max-[460px]:max-h-[45px]"
              priority
            />
          </div>
          <div className="flex flex-col items-center w-full">{children}</div>
        </div>
      </div>
      <div className="h-20 shrink-0 w-full bg-[#27272A] flex items-center justify-center">
        <div className={`mr-2.5 text-md text-[#FEFEFE] ${inter.className}`}>Powered by</div>
        <div>
          <a href="https://ragie.ai/?utm_source=oss-chatbot">
            <RagieLogo />
          </a>
        </div>
      </div>
    </div>
  );
}
