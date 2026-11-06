"use client";

import { track } from "@vercel/analytics";
import { demoContactTag, withContactTag } from "@/lib/contact";

/** De onde veio o pedido de demonstração (para comparar no painel da Vercel). */
export type DemoOrigin = "cabecalho" | "bloco-contacto" | "entrar";
export type DemoChannel = "whatsapp" | "email";
/** Botões "Pedir demonstração" que levam à secção de contacto (ainda não é o pedido). */
export type DemoCtaOrigin = "hero" | "precos";

/**
 * Eventos de conversão (Vercel Web Analytics, sem cookies).
 * Nomes curtos e estáveis: mudar o nome parte o histórico no painel.
 * No plano Pro cada evento leva no máximo 2 propriedades: por isso a fonte vai num
 * evento à parte (pedido_por_fonte) em vez de uma 3.ª propriedade no pedido.
 */
export function trackDemoRequest(channel: DemoChannel, origin: DemoOrigin) {
  try {
    track("pedido_demonstracao", { canal: channel, origem: origin });
    const { fonte, campanha } = currentAttribution();
    track("pedido_por_fonte", { fonte, campanha });
  } catch {
    // Analytics nunca pode partir a navegação.
  }
}

export function trackDemoCta(origin: DemoCtaOrigin) {
  try {
    track("cta_demonstracao", { origem: origin, fonte: currentAttribution().fonte });
  } catch {
    // idem
  }
}

/**
 * No clique num link de contacto (wa.me/mailto): acrescenta a etiqueta "fonte · página"
 * à mensagem/assunto, a partir do href original (cliques repetidos não acumulam).
 */
export function tagContactLink(link: HTMLAnchorElement) {
  try {
    link.dataset.baseHref ??= link.href;
    const tag = demoContactTag(currentAttribution().fonte, window.location.pathname);
    link.href = withContactTag(link.dataset.baseHref, tag);
  } catch {
    // Sem etiqueta, o link original continua a funcionar.
  }
}

export function trackInterestSignup() {
  try {
    track("interessado_registado");
  } catch {
    // idem
  }
}

// ---------------------------------------------------------------------------
// Fonte da visita (primeiro contacto da sessão)
// ---------------------------------------------------------------------------

export type Attribution = { fonte: string; campanha: string };

const STORAGE_KEY = "drivecell-fonte";
const NONE: Attribution = { fonte: "direto", campanha: "-" };

/** Só letras, números, "-", "_" e "."; minúsculas; no máximo 40 caracteres. */
function clean(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/**
 * Fonte e campanha a partir do endereço de entrada (código puro, sem dados pessoais):
 * utm_source/utm_campaign se existirem; senão o domínio de onde veio (sem caminho);
 * senão "direto".
 */
export function attributionFrom(search: string, referrer: string, ownHost: string): Attribution {
  const params = new URLSearchParams(search);
  const utmSource = clean(params.get("utm_source"));
  if (utmSource) {
    return { fonte: utmSource, campanha: clean(params.get("utm_campaign")) || "-" };
  }
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (host && host !== ownHost.replace(/^www\./, "")) {
      return { fonte: clean(host), campanha: "-" };
    }
  } catch {
    // Sem referrer (ou inválido): visita direta.
  }
  return NONE;
}

/**
 * Guarda a fonte da visita nesta sessão (chamar ao carregar o site): uma fonte conhecida
 * (UTM ou outro site) substitui a anterior; uma visita direta nunca apaga a que já existe.
 */
export function rememberAttribution() {
  try {
    const value = attributionFrom(window.location.search, document.referrer, window.location.hostname);
    if (value.fonte === NONE.fonte && sessionStorage.getItem(STORAGE_KEY)) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Sem sessionStorage (modo privado, bloqueado): fica "direto".
  }
}

export function currentAttribution(): Attribution {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Attribution> | null;
    if (saved?.fonte) return { fonte: clean(saved.fonte) || "direto", campanha: clean(saved.campanha) || "-" };
  } catch {
    // idem
  }
  return NONE;
}
