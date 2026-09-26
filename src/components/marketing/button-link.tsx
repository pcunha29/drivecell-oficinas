import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Botões do site público.
 * - primary: fundo tinta, texto papel; hover → acento com texto branco
 * - ghost: contorno de 1px em tinta
 * - light: fundo branco (sobre superfícies de acento)
 */
const base =
  "inline-flex shrink-0 items-center justify-center gap-2.5 rounded-[4px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--focus-ring,#0d2c4a)]";

export const buttonVariants = {
  primary: "bg-night text-paper hover:bg-accent hover:text-white",
  ghost: "border border-night text-night hover:bg-night hover:text-paper",
  light: "bg-white text-ink hover:bg-paper",
} as const;

export const buttonSizes = {
  /** 52px — tamanho por omissão */
  md: "h-[52px] px-6 text-[15px]",
  /** 44px — cabeçalho */
  sm: "h-11 px-[18px] text-sm",
  /** 56px — bloco de chamada final */
  lg: "h-14 px-7 text-base",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(base, buttonVariants[variant], buttonSizes[size], className);
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
