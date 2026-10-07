import type { InputHTMLAttributes } from "react";
import { TERMS_VERSION } from "@/content/legal";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

/** Checkbox "Li e aceito os Termos e a Política de Privacidade" (abre os documentos noutro separador). */
export function TermsCheckbox({ error, id = "terms", ...input }: Props) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-night"
          {...input}
        />
        <label htmlFor={id} className="cursor-pointer text-[14px] leading-[1.55] text-ink-2">
          Li e aceito os{" "}
          <a href="/termos" target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline underline-offset-2 hover:text-accent">
            Termos de utilização
          </a>{" "}
          e a{" "}
          <a
            href="/termos#privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-ink underline underline-offset-2 hover:text-accent"
          >
            Política de privacidade
          </a>{" "}
          <span className="whitespace-nowrap text-ink-muted">(versão {TERMS_VERSION})</span>.
        </label>
      </div>
      {error ? (
        <p id={errorId} className="m-0 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const TERMS_REQUIRED_MESSAGE = "Para continuar, tens de aceitar os Termos e a Política de privacidade.";
