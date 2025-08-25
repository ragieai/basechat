import { cn } from "@/lib/utils";

interface Props {
  checked?: boolean;
  className?: string;
}

export default function Radio({ checked, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-full border",
        {
          "border-[#D946EF]": !!checked,
          "border-surface-text-primary": !checked,
        },
        className,
      )}
      style={{ width: 16, height: 16 }}
    >
      {checked && (
        <div
          className="bg-[color:var(--brand)] rounded-full relative"
          style={{ width: 10, height: 10, top: 2, left: 2 }}
        ></div>
      )}
    </div>
  );
}
