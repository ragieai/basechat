"use client";

import Radio from "@/components/ui/radio";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description: string;
  costPerMonth: number;
  badge?: string;
  selected: boolean;
  className?: string;
  value: string;
  onClick?: (value: string) => void;
}

export default function PlanCardRadio({
  title,
  description,
  costPerMonth,
  badge,
  value,
  onClick,
  selected,
  className,
}: Props) {
  return (
    <div
      className={cn("flex flex-col gap-3 p-4 border rounded-[12px] bg-card hover:cursor-pointer", className, {
        "border-[#D946EF]": selected,
      })}
      onClick={() => onClick?.(value)}
    >
      <span className="text-base">{title}</span>
      <div className="flex items-center justify-between text-base">
        <div className="flex items-center">
          <span>${costPerMonth} / month</span>
          {badge && (
            <span className="bg-[color:var(--brand)] py-[2px] px-[6px] rounded-sm ml-2 text-white">{badge}</span>
          )}
        </div>
        <Radio checked={selected} />
      </div>
      <span className="text-xs text-muted-foreground">{description}</span>
    </div>
  );
}
