import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Área privada fora dos motores de busca; o resto é público. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/admin", "/conta", "/auth", "/api", "/sem-oficina", "/em-construcao"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
