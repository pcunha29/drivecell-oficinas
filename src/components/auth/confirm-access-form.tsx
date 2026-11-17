"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { confirmAccessAction, type ConfirmAccessState } from "@/app/auth/continuar/actions";
import { buttonClasses } from "@/components/marketing/button-link";
import {
  CONFIRM_MESSAGES,
  hashDestination,
  hashErrorMessage,
  parseAuthHash,
} from "@/lib/auth-confirm";
import { createClient } from "@/lib/supabase/client";

const initialState: ConfirmAccessState = { error: null };

type Props = {
  tokenHash: string;
  type: string;
  next: string;
  /** Há token_hash válido na query: mostra o botão "Continuar". Sem ele, lê o fragmento do URL. */
  hasToken: boolean;
};

type HashState = { status: "checking" } | { status: "error"; message: string };

/** Abre a sessão a partir do fragmento #access_token=… (template de email por omissão). */
function useHashSession(enabled: boolean, next: string): HashState | null {
  const [state, setState] = useState<HashState | null>(enabled ? { status: "checking" } : null);

  useEffect(() => {
    if (!enabled) return;
    const hash = window.location.hash;
    // O fragmento traz tokens: tirá-lo já da barra de endereço e do histórico.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    let cancelled = false;
    const fail = (message: string) => {
      if (!cancelled) setState({ status: "error", message });
    };

    async function openSession() {
      const parsed = parseAuthHash(hash);
      if (!parsed) return fail(CONFIRM_MESSAGES.expired);
      if (parsed.kind === "error") return fail(hashErrorMessage(parsed));

      const { error } = await createClient().auth.setSession({
        access_token: parsed.accessToken,
        refresh_token: parsed.refreshToken,
      });
      if (error) return fail(hashErrorMessage({ code: error.code ?? "", description: error.message }));
      // Navegação completa: o servidor passa a ver a sessão nos cookies.
      if (!cancelled) window.location.replace(hashDestination(parsed.type, next));
    }

    openSession().catch(() => fail(CONFIRM_MESSAGES.generic));
    return () => {
      cancelled = true;
    };
  }, [enabled, next]);

  return state;
}

export function ConfirmAccessForm({ tokenHash, type, next, hasToken }: Props) {
  const [state, formAction, pending] = useActionState(confirmAccessAction, initialState);
  const hash = useHashSession(!hasToken, next);

  const error = hash?.status === "error" ? hash.message : state.error;
  const checking = hash?.status === "checking";
  const failed = Boolean(error);

  return (
    <form action={formAction} className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-2.5">
        <span className="eyebrow">A tua conta</span>
        <h2 className="display-serif m-0 text-[40px] leading-[1.05] sm:text-[48px]">
          {failed ? "Link sem efeito" : checking ? "A confirmar o acesso" : "Confirma o acesso"}
        </h2>
      </div>

      {!failed && (
        <p className="m-0 text-[16px] leading-[1.6] text-ink-2" role={checking ? "status" : undefined}>
          {checking
            ? "Só um momento: estamos a abrir a tua conta."
            : "Carrega em Continuar para entrares e definires a tua palavra-passe."}
        </p>
      )}

      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />

      <div role="alert" className="empty:hidden">
        {error ? (
          <p className="m-0 rounded-[4px] border border-danger/40 bg-danger-soft px-3.5 py-3 text-[14px] leading-[1.5] text-danger">
            {error}
          </p>
        ) : null}
      </div>

      {failed ? (
        <Link href="/entrar" className={`${buttonClasses("primary", "md")} w-full`}>
          Ir para a entrada
        </Link>
      ) : checking ? null : (
        <button
          type="submit"
          disabled={pending}
          className={`${buttonClasses("primary", "md")} w-full cursor-pointer disabled:cursor-wait disabled:opacity-70`}
        >
          {pending ? "A confirmar…" : "Continuar"}
        </button>
      )}
    </form>
  );
}
