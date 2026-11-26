import type { MetadataRoute } from "next";
import { TERMS_UPDATED_AT } from "@/content/legal";
import { SITE_URL } from "@/lib/site";

/** Páginas públicas. Com o modo "em construção" ligado, / e /precos respondem com noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  // Sem lastModified nas páginas de marketing: a data do build não é uma alteração real e o Google ignora datas pouco fiáveis.
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/precos`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/modelos/folha-de-obra-oficina`, changeFrequency: "yearly", priority: 0.7 },
    { url: `${SITE_URL}/termos`, lastModified: new Date(TERMS_UPDATED_AT), changeFrequency: "yearly", priority: 0.3 },
  ];
}
