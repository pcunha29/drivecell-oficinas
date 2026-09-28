"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/** Caminhos que não contam para as estatísticas (as tuas visitas ao admin e à conta). */
const EXCLUDED_PREFIXES = ["/admin", "/conta", "/auth"];

function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    if (EXCLUDED_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`))) {
      return null;
    }
    // Sem parâmetros (podem trazer tokens ou emails); mantém só as UTM das campanhas.
    const kept = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
      if (key.startsWith("utm_")) kept.set(key, value);
    });
    url.search = kept.toString();
    return { ...event, url: url.toString() };
  } catch {
    return event;
  }
}

/** Vercel Web Analytics: visitas anónimas, sem cookies. */
export function SiteAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
