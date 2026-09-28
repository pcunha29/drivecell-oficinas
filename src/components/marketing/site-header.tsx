import Link from "next/link";
import { buttonClasses } from "./button-link";
import { siteContainer } from "./container";
import { ContactMenu } from "./contact-menu";
import { MobileMenu } from "./mobile-menu";
import { DrivecellLogo } from "@/components/brand/drivecell-logo";

const navLink = "min-h-11 items-center transition-colors hover:text-accent";

export function SiteHeader() {
  return (
    <header className="relative border-b border-line">
      <div
        className={`${siteContainer} flex h-[72px] items-center justify-between gap-4 md:h-[88px]`}
      >
        <Link
          href="/"
          className="flex min-h-11 shrink-0 items-center text-ink"
          aria-label="DriveCell Oficinas - início"
        >
          <DrivecellLogo
            height={26}
            product
            priority
            heightClassName="h-[18px] sm:h-[22px] md:h-[26px]"
            productClassName="hidden sm:inline"
          />
        </Link>

        <div className="flex items-center gap-2 text-[15px] text-ink sm:gap-5 lg:gap-9">
          <nav
            className="hidden items-center gap-5 md:flex lg:gap-9"
            aria-label="Principal"
          >
            <Link href="/#funcionalidades" className={`${navLink} inline-flex`}>
              Funcionalidades
            </Link>
            <Link href="/precos" className={`${navLink} inline-flex`}>
              Preços
            </Link>
            <Link href="/#perguntas" className={`${navLink} inline-flex`}>
              Perguntas
            </Link>
            <Link href="/entrar" className={`${navLink} inline-flex`}>
              Entrar
            </Link>
          </nav>
          <ContactMenu
            label={
              <>
                <span className="sm:hidden">Demonstração</span>
                <span className="hidden sm:inline">Pedir demonstração</span>
              </>
            }
            triggerClassName={buttonClasses(
              "primary",
              "sm",
              "gap-1.5 px-3.5 sm:px-[18px]",
            )}
            origin="cabecalho"
          />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
