import { Inter, Inter_Tight } from "next/font/google";

import RagieLogo from "@/components/ragie-logo";
import * as settings from "@/lib/server/settings";
import { cn } from "@/lib/utils";

const inter_tight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({ subsets: ["latin"] });

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen flex flex-col items-center bg-white">
      <div className="flex-grow h-full flex flex-col items-center justify-center">
        <div className="w-[442px]">
          <div className="flex items-center mb-16">
            <div className="max-h-[64px] max-w-[64px] avatar mr-3" />
            <h1 className={cn(inter_tight.className, "text-[75px] font-bold")}>{settings.APP_NAME}</h1>
          </div>
          <div className="flex flex-col items-center">{children}</div>
        </div>
      </div>
      <div className="h-20 w-full bg-[#27272A] flex items-center justify-center">
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
