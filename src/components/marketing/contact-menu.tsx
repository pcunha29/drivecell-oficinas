"use client";

import { useEffect, useId, useRef, useState } from "react";
import { mailtoUrl, whatsappUrl, CONTACT_EMAIL } from "@/lib/contact";
import { cn } from "@/lib/utils";
import { trackDemoRequest, type DemoOrigin } from "@/lib/analytics/events";
import { MailIcon, WhatsAppIcon } from "./contact-icons";

type ContactMenuProps = {
  /** Texto do botão que abre o menu. */
  label?: React.ReactNode;
  /** Mensagem pré-preenchida no WhatsApp. */
  whatsappText?: string;
  /** Assunto do email. */
  emailSubject?: string;
  /** Classes do botão que abre o menu. */
  triggerClassName?: string;
  /** Lado para onde o painel abre. */
  align?: "left" | "right";
  /** Onde está o menu (para as estatísticas de pedidos de demonstração). */
  origin?: DemoOrigin;
};

/**
 * "Pedir demonstração" sem mudar de página: abre um pequeno painel com
 * WhatsApp e email. Fecha com Escape, clique fora ou ao escolher uma opção.
 */
export function ContactMenu({
  label = "Pedir demonstração",
  whatsappText = "Olá! Gostava de marcar uma demonstração do DriveCell Oficinas.",
  emailSubject = "Demonstração DriveCell Oficinas",
  triggerClassName,
  align = "right",
  origin = "entrar",
}: ContactMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const option =
    "flex min-h-12 items-center gap-3 rounded-[4px] px-3 py-2.5 text-left no-underline transition-colors";

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex min-h-11 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 font-sans font-medium text-ink hover:text-accent",
          triggerClassName,
        )}
      >
        {label}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn("transition-transform duration-150", open && "rotate-180")}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className={cn(
          "absolute top-full z-30 mt-2 w-[min(300px,calc(100vw-2.5rem))] rounded-md border border-line bg-paper-card p-2 text-left shadow-[0_18px_40px_-18px_rgba(13,44,74,0.35)]",
          align === "right" ? "right-0" : "left-0",
        )}
      >
        <p className="m-0 px-3 pt-1.5 pb-2 text-[13px] leading-snug text-ink-muted">
          Fala connosco e marcamos uma demonstração com a oficina de exemplo.
        </p>
        <a
          href={whatsappUrl(whatsappText)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackDemoRequest("whatsapp", origin);
            setOpen(false);
          }}
          className={cn(option, "bg-night text-paper hover:bg-night-2")}
        >
          <WhatsAppIcon />
          <span className="flex flex-col">
            <span className="text-[15px] font-medium">WhatsApp</span>
            <span className="text-[12px] text-on-dark-2">Resposta mais rápida</span>
          </span>
        </a>
        <a
          href={mailtoUrl(emailSubject)}
          onClick={() => {
            trackDemoRequest("email", origin);
            setOpen(false);
          }}
          className={cn(option, "mt-1.5 border border-line text-ink hover:border-night hover:bg-paper")}
        >
          <MailIcon />
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-medium">Email</span>
            <span className="truncate text-[12px] text-ink-muted">{CONTACT_EMAIL}</span>
          </span>
        </a>
      </div>
    </div>
  );
}
