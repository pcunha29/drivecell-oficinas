"use client";

import { track } from "@vercel/analytics";

/** De onde veio o pedido de demonstração (para comparar no painel da Vercel). */
export type DemoOrigin = "cabecalho" | "bloco-contacto" | "entrar";
export type DemoChannel = "whatsapp" | "email";

/**
 * Eventos de conversão (Vercel Web Analytics, sem cookies).
 * Nomes curtos e estáveis: mudar o nome parte o histórico no painel.
 */
export function trackDemoRequest(channel: DemoChannel, origin: DemoOrigin) {
  try {
    track("pedido_demonstracao", { canal: channel, origem: origin });
  } catch {
    // Analytics nunca pode partir a navegação.
  }
}

export function trackInterestSignup() {
  try {
    track("interessado_registado");
  } catch {
    // idem
  }
}
