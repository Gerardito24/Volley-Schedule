import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-sky-600 text-white hover:bg-sky-700 border-transparent",
  secondary: "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50",
  ghost: "border-transparent text-zinc-700 hover:bg-zinc-100",
  danger: "bg-red-600 text-white hover:bg-red-700 border-transparent",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export function Button({ variant = "primary", className = "", children, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 lg:min-h-0 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
