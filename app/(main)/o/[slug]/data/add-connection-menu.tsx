"use client";

import { Inter } from "next/font/google";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CONNECTOR_MAP from "@/lib/connector-map";

const inter = Inter({ subsets: ["latin"] });

interface Props {
  tenant: {
    slug: string;
  };
}

export default function AddConnectionMenu({ tenant }: Props) {
  const router = useRouter();

  const onSelect = async (sourceType: string) => {
    const res = await fetch(`/api/ragie/connect/${sourceType}`, {
      headers: { tenant: tenant.slug },
    });
    if (res.status < 200 || res.status >= 300) throw new Error("Could not retrieve redirect URL");
    const { url } = (await res.json()) as { url: string };
    router.push(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center rounded-[40px] h-[40px] px-5 bg-[#FFFFFF] border border-[#D7D7D7] font-semibold hover:bg-[#F5F5F7] data-[state=open]:bg-[#F5F5F7]">
          <div className="mr-2">Add Connection</div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <mask
              id="mask0_217_2334"
              style={{ maskType: "alpha" }}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="16"
              height="16"
            >
              <rect y="16" width="16" height="16" transform="rotate(-90 0 16)" fill="#D9D9D9" />
            </mask>
            <g mask="url(#mask0_217_2334)">
              <path d="M12 6.3999L8 10.3999L4 6.3999L4.85 5.5499L8 8.6999L11.15 5.5499L12 6.3999Z" fill="#1C1B1F" />
            </g>
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-[#F5F5F7] border border-[#D7D7D7] py-4 px-2.5 rounded-[24px] mt-4 max-h-[calc(100vh-155px)] overflow-y-auto overflow-x-visible pr-1 scrollbar-thin"
      >
        {Object.entries(CONNECTOR_MAP).map(([sourceType, [name, icon]]) => (
          <DropdownMenuItem
            key={sourceType}
            className="w-[190px] h-[35px] flex items-center mb-2 px-2 cursor-pointer"
            onSelect={() => onSelect(sourceType)}
          >
            <Image src={icon} alt={name} width={24} height={24} className="mr-3" />
            <div className={inter.className}>{name}</div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
