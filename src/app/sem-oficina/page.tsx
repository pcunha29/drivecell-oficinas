import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthSplit } from "@/components/auth/auth-split";
import { buttonClasses } from "@/components/marketing/button-link";
import { mailtoUrl, whatsappUrl } from "@/lib/contact";
import { isAdminEmail } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Conta sem oficina",
  robots: { index: false, follow: false },
};

// Depende da sessão: nunca pré-renderizar.
export const dynamic = "force-dynamic";

export default async function SemOficinaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar?next=/sem-oficina");
  if (isAdminEmail(user.email)) redirect("/admin");

  const { data: membership } = await supabase
    .from("workshop_members")
    .select("workshop_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) redirect("/app");

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <AuthSplit
        headline={
          <>
            Quase lá.
            <br />
            <em className="text-accent-soft">Falta a oficina.</em>
          </>
        }
      >
        <div className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-2.5">
            <span className="eyebrow">A tua conta</span>
            <h2 className="display-serif m-0 text-[40px] leading-[1.05] sm:text-[48px]">
              Ainda sem oficina
            </h2>
          </div>
          <p className="m-0 text-[16px] leading-[1.6] text-ink-2">
            A tua conta
            {user.email ? (
              <>
                {" "}
                (<strong className="font-medium text-ink">{user.email}</strong>)
              </>
            ) : null}{" "}
            ainda não está associada a uma oficina. Fala connosco.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={whatsappUrl(
                "Olá! A minha conta DriveCell Oficinas ainda não tem oficina associada.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("primary", "md", "sm:flex-1")}
            >
              WhatsApp
            </a>
            <a
              href={mailtoUrl("Conta sem oficina - DriveCell Oficinas")}
              className={buttonClasses("ghost", "md", "sm:flex-1")}
            >
              Email
            </a>
          </div>
          <form action="/auth/signout" method="post" className="m-0">
            <button
              type="submit"
              className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[14px] text-ink underline hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Sair
            </button>
          </form>
        </div>
      </AuthSplit>
    </div>
  );
}
