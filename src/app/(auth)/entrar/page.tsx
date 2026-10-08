import type { Metadata } from "next";
import { AuthSplit } from "@/components/auth/auth-split";
import { LoginForm } from "@/components/auth/login-form";
import { ContactMenu } from "@/components/marketing/contact-menu";
import { HeroBoard } from "@/components/marketing/hero-board";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entra na tua oficina no DriveCell Oficinas com Google ou com email e palavra-passe.",
};

const ERROR_MESSAGES: Record<string, string> = {
  auth: "Não foi possível concluir o login. Tenta outra vez.",
  sem_conta:
    "Não há nenhuma conta DriveCell com esse email Google. As contas são criadas por nós: entra com o email onde recebeste o convite ou pede-nos uma demonstração.",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const errorKey = firstParam(params.error);
  const initialError = errorKey ? ERROR_MESSAGES[errorKey] : undefined;
  const next = firstParam(params.next);

  return (
    <AuthSplit
      headline={
        <>
          Bem-vindo de volta.
          <br />
          <em className="text-accent-soft">A oficina aguarda por ti.</em>
        </>
      }
      aside={
        <div className="max-w-[560px]">
          <HeroBoard tone="dark" />
        </div>
      }
      mobileAside={
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Exemplo do quadro de ordens">
          {[
            { label: "Em espera", n: 2, active: false },
            { label: "Em curso", n: 1, active: true },
            { label: "Entregue", n: 1, active: false },
          ].map((c) => (
            <li
              key={c.label}
              className={`flex items-center gap-2 rounded-[4px] border px-2.5 py-1.5 font-mono text-[11px] tracking-[0.1em] uppercase ${
                c.active ? "border-accent-soft text-accent-soft" : "border-night-line text-on-dark-2"
              }`}
            >
              {c.label}
              <span className={c.active ? "text-on-dark" : "text-on-dark-3"}>{c.n}</span>
            </li>
          ))}
        </ul>
      }
      asideFooter={<p className="m-0 font-mono text-[12px] text-on-dark-3">Dados alojados na União Europeia</p>}
      topRight={
        <>
          <span>Ainda não tens conta?</span>
          <ContactMenu />
        </>
      }
    >
      <LoginForm next={next} initialError={initialError} />
    </AuthSplit>
  );
}
