/**
 * Contactos do DriveCell Oficinas (demonstrações, reativar contas).
 * Marcadores a substituir pelos valores reais antes de publicar.
 */
export const CONTACT_EMAIL = "pcunhadev@gmail.com";
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

/** Partilhar um texto no WhatsApp escolhendo o contacto (não abre a conversa com a DriveCell). */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Perfis públicos nas redes sociais (rodapé e dados estruturados). */
export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/drivecell.pt/",
  facebook: "https://www.facebook.com/profile.php?id=61594923510482",
} as const;
