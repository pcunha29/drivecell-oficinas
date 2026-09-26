"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { ArrowRight, Check } from "lucide-react";
import {
  registerInterestAction,
  type InterestState,
} from "@/app/em-construcao/actions";

const initialState: InterestState = { status: "idle" };

/** Formulário da lista de interessados (página "Em construção"), sobre fundo azul-marinho. */
export function InterestForm() {
  const [state, formAction, pending] = useActionState(registerInterestAction, initialState);
  const successRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "success") successRef.current?.focus();
  }, [state.status]);

  if (state.status === "success") {
    return (
      <p
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="m-0 flex items-start gap-3 rounded-[4px] border border-accent-soft/60 bg-night-2 px-4 py-4 text-[15px] leading-relaxed text-on-dark outline-none"
      >
        <Check className="mt-0.5 size-5 shrink-0 text-accent-soft" aria-hidden />
        <span>
          <strong className="font-medium">Está feito.</strong> Vais ser dos primeiros a saber quando
          abrirmos.
        </span>
      </p>
    );
  }

  const error = state.status === "error" ? state.message : null;

  return (
    <form action={formAction} noValidate className="flex w-full max-w-[480px] flex-col gap-3">
      <label htmlFor="interesse-email" className="text-sm font-medium text-on-dark">
        O teu email
      </label>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          id="interesse-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          // O React limpa o formulário depois de cada envio: repõe o que foi escrito se der erro.
          defaultValue={state.status === "error" ? state.email : undefined}
          key={state.status === "error" ? `erro-${state.email}-${state.message}` : "vazio"}
          placeholder="nome@oficina.pt"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "interesse-erro interesse-nota" : "interesse-nota"}
          className="h-[52px] w-full min-w-0 rounded-[4px] sm:flex-1 border border-night-line bg-night-2 px-4 text-[16px] text-on-dark placeholder:text-on-dark-3 aria-[invalid=true]:border-[#f0a79d]"
        />
        {/* Armadilha para robôs: invisível para pessoas e leitores de ecrã. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="interesse-empresa">Empresa</label>
          <input id="interesse-empresa" name="empresa" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-[52px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[4px] bg-accent-soft px-6 text-[15px] font-medium text-night transition-colors hover:bg-gold-tint disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "A guardar…" : "Avisem-me"}
          {!pending && <ArrowRight className="size-4" aria-hidden />}
        </button>
      </div>
      <p id="interesse-erro" role="alert" className="m-0 min-h-0 text-sm text-[#f0a79d] empty:hidden">
        {error}
      </p>
      <p id="interesse-nota" className="m-0 text-[13px] leading-relaxed text-on-dark-3">
        Só usamos o email para te avisar do lançamento. Sem publicidade, e podes pedir para o
        apagarmos quando quiseres.{" "}
        <Link href="/termos#privacidade" className="text-on-dark-2 underline underline-offset-4 hover:text-on-dark">
          Privacidade
        </Link>
      </p>
    </form>
  );
}
