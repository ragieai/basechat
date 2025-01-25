import { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Title({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("self-start text-[24px] font-bold", className)}>{children}</div>;
}

export function Button({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <button
      className={cn("text-md text-white text-[16px] font-semibold bg-[#D946EF] rounded-[54px] py-2 w-full", className)}
    >
      {children}
    </button>
  );
}

export function Error({ error, className }: { error: string[] | undefined; className?: string }) {
  return (
    error && (
      <ul className={cn("mb-4", className)}>
        {error.map((e, i) => (
          <li key={i} className="text-red-500 text-center">
            {e}
          </li>
        ))}
      </ul>
    )
  );
}
