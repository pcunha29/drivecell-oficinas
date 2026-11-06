/**
 * Contactos do DriveCell Oficinas (demonstrações, reativar contas).
 * Marcadores a substituir pelos valores reais antes de publicar.
 */
export const CONTACT_EMAIL = "geral@drivecell.pt";
/** Formato internacional sem espaços nem "+", como o wa.me exige (ex. 351912345678). */
export const CONTACT_PHONE = "+351912079695";

export function whatsappUrl(text?: string): string {
  const base = `https://wa.me/${CONTACT_PHONE.replace(/\D/g, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function mailtoUrl(subject?: string): string {
  const base = `mailto:${CONTACT_EMAIL}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}

/**
 * Etiqueta curta para a mensagem/assunto de um pedido de demonstração, para quem responde
 * saber de onde veio o contacto: "Google · preços", "site · página inicial".
 * `fonte` vem da atribuição da visita (utm_source ou domínio de origem; "direto" se nenhum).
 */
export function demoContactTag(fonte: string, pathname: string): string {
  const f = fonte.toLowerCase();
  const source =
    f === "direto" || !f
      ? "site"
      : f.includes("google")
        ? "Google"
        : f.includes("facebook") || f === "fb"
          ? "Facebook"
          : f.includes("instagram") || f === "ig"
            ? "Instagram"
            : f;
  const place: Record<string, string> = {
    "/": "página inicial",
    "/precos": "preços",
    "/entrar": "entrar",
  };
  return `${source} · ${place[pathname] ?? "site"}`;
}

/**
 * Acrescenta "(etiqueta)" ao texto do WhatsApp (`text`) ou ao assunto do email (`subject`)
 * de um link wa.me/mailto. Codifica com encodeURIComponent (o "+" de URLSearchParams
 * aparece literal em alguns clientes de email).
 */
export function withContactTag(href: string, tag: string): string {
  const [base, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  const key = href.startsWith("mailto:") ? "subject" : "text";
  const current = params.get(key) ?? "";
  params.delete(key);
  const value = current ? `${current} (${tag})` : `(${tag})`;
  const rest = [...params].map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return `${base}?${[`${key}=${encodeURIComponent(value)}`, ...rest].join("&")}`;
}

/** Partilhar um texto no WhatsApp escolhendo o contacto (não abre a conversa com a DriveCell). */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Perfis públicos nas redes sociais (rodapé e dados estruturados). */
export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/drivecell.pt/",
  facebook: "https://www.facebook.com/profile.php?id=61594923510482",
} as const;
