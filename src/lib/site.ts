/** Endereço público do site (sem barra final). Usado em metadados, sitemap e dados estruturados. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://drivecell.pt").replace(/\/+$/, "");

export const SITE_NAME = "DriveCell Oficinas";

/** Frase curta da marca (hero e imagem de partilha). */
export const SITE_TAGLINE = "A oficina organizada. Sem papelada.";
