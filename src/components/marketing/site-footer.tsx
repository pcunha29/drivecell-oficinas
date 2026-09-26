import Link from "next/link";
import { mailtoUrl, whatsappUrl } from "@/lib/contact";
import { siteContainer } from "./container";
import { DrivecellLogo } from "@/components/brand/drivecell-logo";

const footerLink = "inline-flex min-h-11 items-center transition-colors hover:text-accent md:min-h-0";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line text-sm text-ink-muted">
      <div
        className={`${siteContainer} flex flex-col items-start justify-between gap-8 py-12 md:flex-row`}
      >
        <div className="flex flex-col gap-2">
          <DrivecellLogo height={22} />
          <span>Flachbau Unipessoal, Lda · NIF 518094650 · Portugal</span>
        </div>
        <nav className="flex flex-wrap gap-x-7 gap-y-3" aria-label="Rodapé">
          <Link href="/termos" className={footerLink}>
            Termos
          </Link>
          <Link href="/termos#privacidade" className={footerLink}>
            Privacidade
          </Link>
          <a href={mailtoUrl()} className={footerLink}>
            Contacto
          </a>
          <a
            href={whatsappUrl()}
            className={footerLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        </nav>
      </div>
    </footer>
  );
}
