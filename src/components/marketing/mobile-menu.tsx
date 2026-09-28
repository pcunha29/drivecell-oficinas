"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#funcionalidades", label: "Funcionalidades" },
  { href: "/precos", label: "Preços" },
  { href: "/#perguntas", label: "Perguntas" },
  { href: "/entrar", label: "Entrar" },
] as const;

/**
 * Menu do cabeçalho no telemóvel (abaixo de md): abre um painel por baixo do
 * cabeçalho. Fecha com Escape, clique fora ou ao escolher um link.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        onClick={() => setOpen((v) => !v)}
        className="-mr-2 inline-flex size-11 cursor-pointer items-center justify-center rounded-[4px] border-0 bg-transparent p-0 text-ink hover:text-accent"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      <nav
        id={panelId}
        hidden={!open}
        aria-label="Menu"
        className="absolute inset-x-0 top-full z-30 border-b border-line bg-paper shadow-[0_18px_30px_-20px_rgba(13,44,74,0.35)]"
      >
        <ul className="m-0 list-none px-5 py-2">
          {LINKS.map((link, i) => (
            <li key={link.href} className={cn(i > 0 && "border-t border-line")}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center text-[16px] text-ink no-underline hover:text-accent"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
