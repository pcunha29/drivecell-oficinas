import Image from "next/image";
import { cn } from "@/lib/utils";

/** Proporção do logótipo completo (public/logos/logo-full-*.png: 454 × 66). */
const LOGO_RATIO = 454 / 66;

type Variant = "color" | "white" | "auto";

type DrivecellLogoProps = {
  /** color: fundos claros · white: fundos escuros · auto: segue o tema claro/escuro da app. */
  variant?: Variant;
  /** Altura em px (a largura segue a proporção). */
  height?: number;
  /** Mostra "OFICINAS" ao lado, separado por um traço. */
  product?: boolean;
  /** Classes extra para o rótulo "Oficinas" (ex.: "hidden sm:inline"). */
  productClassName?: string;
  /** Altura responsiva por classes (a `height` passa a ser só a base do tamanho intrínseco). */
  heightClassName?: string;
  priority?: boolean;
  className?: string;
};

function LogoImage({
  tone,
  height,
  priority,
  className,
  responsive,
}: {
  tone: "color" | "white";
  height: number;
  priority?: boolean;
  className?: string;
  /** Classes de altura (ex.: "h-[18px] md:h-[26px]"); substitui a altura fixa. */
  responsive?: string;
}) {
  return (
    <Image
      src={`/logos/logo-full-${tone}.png`}
      alt="DriveCell"
      width={Math.round(height * LOGO_RATIO)}
      height={height}
      priority={priority}
      className={cn("block w-auto max-w-none select-none", responsive, className)}
      style={responsive ? undefined : { height, width: "auto" }}
    />
  );
}

/** Logótipo DriveCell (+ "Oficinas" opcional). */
export function DrivecellLogo({
  variant = "color",
  height = 24,
  product = false,
  productClassName,
  heightClassName,
  priority,
  className,
}: DrivecellLogoProps) {
  const productTone =
    variant === "white"
      ? "border-white/25 text-on-dark-3"
      : variant === "auto"
        ? "border-border text-muted-foreground"
        : "border-line text-ink-muted";

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {variant === "auto" ? (
        <>
          <LogoImage tone="color" height={height} priority={priority} responsive={heightClassName} className="dark:hidden" />
          <LogoImage tone="white" height={height} priority={priority} responsive={heightClassName} className="hidden dark:block" />
        </>
      ) : (
        <LogoImage tone={variant} height={height} priority={priority} responsive={heightClassName} />
      )}
      {product && (
        <span
          className={cn(
            "border-l pl-3 font-mono text-[11px] uppercase leading-none tracking-[0.14em]",
            productTone,
            productClassName,
          )}
        >
          Oficinas
        </span>
      )}
    </span>
  );
}

/** Só o símbolo (chevron + D), para espaços pequenos. */
export function DrivecellIcon({
  variant = "color",
  size = 28,
  className,
}: {
  variant?: Variant;
  size?: number;
  className?: string;
}) {
  const w = Math.round(size * (97 / 64));
  const img = (tone: "color" | "white", extra?: string) => (
    <Image
      src={tone === "color" ? "/logos/icon_color.svg" : "/logos/icon_white.png"}
      alt=""
      aria-hidden
      width={w}
      height={size}
      className={cn("block shrink-0 select-none", extra)}
      style={{ height: size, width: w }}
      unoptimized={tone === "color"}
    />
  );
  if (variant === "auto") {
    return (
      <span className={cn("inline-flex", className)}>
        {img("color", "dark:hidden")}
        {img("white", "hidden dark:block")}
      </span>
    );
  }
  return <span className={cn("inline-flex", className)}>{img(variant)}</span>;
}
