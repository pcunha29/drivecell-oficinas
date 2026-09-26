import { cn } from "@/lib/utils";

/** Largura máxima (1440px) e margens laterais do site público: 20px → 40px → 80px. */
export const siteContainer = "mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-20";

export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn(siteContainer, className)} {...props} />;
}
