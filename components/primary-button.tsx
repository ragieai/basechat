import { Button, ButtonProps } from "./ui/button";

interface PrimaryButtonProps extends ButtonProps {
  children: React.ReactNode;
  className?: string;
}

export default function PrimaryButton({ children, className, ...props }: PrimaryButtonProps) {
  return (
    <Button
      {...props}
      className={`bg-[color:var(--brand)] hover:bg-[color:var(--brand)]/90 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/30 text-white flex items-center font-semibold rounded-lg px-4 py-2.5 ml-3 shadow-none disabled:opacity-50 disabled:cursor-not-allowed ${className || ""}`}
    >
      {children}
    </Button>
  );
}
