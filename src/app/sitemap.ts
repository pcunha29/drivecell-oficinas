import type { MetadataRoute } from "next";
import { TERMS_UPDATED_AT } from "@/content/legal";
import { SITE_URL } from "@/lib/site";

/** Páginas públicas. Com o modo "em construção" ligado, / e /precos respondem com noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/precos`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/termos`, lastModified: new Date(TERMS_UPDATED_AT), changeFrequency: "yearly", priority: 0.3 },
  ];
}
