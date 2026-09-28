import { mailtoUrl, whatsappUrl } from "@/lib/contact";
import { buttonClasses } from "./button-link";
import { Container } from "./container";
import { MailIcon, WhatsAppIcon } from "./contact-icons";
import { TrackedContactLink } from "./tracked-contact-link";

/** Bloco final da landing: marcar uma demonstração (sem registo self-service). */
export function ContactSection() {
  return (
    <Container className="pb-20 md:pb-28">
      <section
        id="contacto"
        aria-labelledby="contacto-titulo"
        className="relative flex scroll-mt-8 flex-col gap-10 overflow-hidden rounded-lg border border-gold/50 bg-gold-tint p-8 text-night md:p-14 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:p-20"
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gold" />
        <div className="flex max-w-[640px] flex-col gap-5">
          <span className="eyebrow text-ink-2!">Demonstração</span>
          <h2
            id="contacto-titulo"
            className="display-serif m-0 text-display-lg"
          >
            Marca uma demonstração.
          </h2>
          <p className="m-0 text-[17px] leading-[1.6] text-ink-2 md:text-lg">
            Mostramos a app com os dados de uma oficina de exemplo e, se fizer
            sentido, configuramos a tua.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <TrackedContactLink
              channel="whatsapp"
              origin="bloco-contacto"
              href={whatsappUrl(
                "Olá! Gostava de marcar uma demonstração do DriveCell Oficinas.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("primary", "lg", "hover:bg-night-2")}
            >
              <WhatsAppIcon />
              WhatsApp
            </TrackedContactLink>
            <TrackedContactLink
              channel="email"
              origin="bloco-contacto"
              href={mailtoUrl("Demonstração DriveCell Oficinas")}
              className={buttonClasses(
                "light",
                "lg",
                "border border-night bg-transparent text-night hover:bg-night hover:text-paper",
              )}
            >
              <MailIcon />
              Email
            </TrackedContactLink>
        </div>
      </section>
    </Container>
  );
}
