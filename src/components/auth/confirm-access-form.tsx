"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmAccessAction, type ConfirmAccessState } from "@/app/auth/continuar/actions";
import { buttonClasses } from "@/components/marketing/button-link";

const initialState: ConfirmAccessState = { error: null };

type Props = {
  tokenHash: string;
  type: string;
  next: string;
  /** Link inválido logo à partida (sem token): mostra só o erro. */
  initialError?: string | null;
};

export function ConfirmAccessForm({ tokenHash, type, next, initialError = null }: Props) {
  const [state, formAction, pending] = useActionState(confirmAccessAction, {
    ...initialState,
    error: initialError,
  });
  const failed = Boolean(state.error);

  return (
    <form action={formAction} className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-2.5">
        <span className="eyebrow">A tua conta</span>
        <h2 className="display-serif m-0 text-[40px] leading-[1.05] sm:text-[48px]">
          {failed ? "Link sem efeito" : "Confirma o acesso"}
        </h2>
      </div>

      {!failed && (
        <p className="m-0 text-[16px] leading-[1.6] text-ink-2">
          Carrega em Continuar para entrares e definires a tua palavra-passe.
        </p>
      )}

      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />

      <div role="alert" className="empty:hidden">
        {state.error ? (
          <p className="m-0 rounded-[4px] border border-danger/40 bg-danger-soft px-3.5 py-3 text-[14px] leading-[1.5] text-danger">
            {state.error}
          </p>
        ) : null}
      </div>

      {failed ? (
        <Link href="/entrar" className={`${buttonClasses("primary", "md")} w-full`}>
          Ir para a entrada
        </Link>
      ) : (
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
