import type { Metadata } from "next";
import Link from "next/link";
import { AuthSplit } from "@/components/auth/auth-split";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Criar conta",
  description:
    "Cria a conta da tua oficina no DriveCell Oficinas e experimenta 7 dias sem cartão. Depois, 49 € por mês ou 490 € por ano, IVA incluído.",
};

const benefits = [
  "Sem cartão. Só pedimos pagamento se decidires continuar.",
  "Sem instalação. Funciona no navegador e no telemóvel.",
  "Os teus dados são teus. Exportas tudo quando quiseres.",
] as const;

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-accent-soft"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export default function RegistarPage() {
  return (
    <AuthSplit
      headline={
        <>
          Sete dias para pôr a oficina <em className="text-accent-soft">em ordem.</em>
        </>
      }
      aside={
        <ul className="m-0 flex list-none flex-col gap-[18px] p-0">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3.5 text-[16px] leading-[1.55] text-on-dark-2">
              <CheckIcon />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      }
      asideFooter={
        <p className="m-0 font-mono text-[12px] text-on-dark-3">
          Depois: 49 € / mês ou 490 € / ano, IVA incluído
        </p>
      }
      topRight={
        <>
          <span>Já tens conta?</span>
          <Link href="/entrar" className="font-medium text-ink hover:text-accent">
            Entrar
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthSplit>
  );
}
