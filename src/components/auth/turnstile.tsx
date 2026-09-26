"use client";

import { useCallback, useEffect, useRef } from "react";
import Script from "next/script";

type TurnstileRenderOptions = {
  sitekey: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
  theme?: "light" | "dark" | "auto";
  language?: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string | undefined;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type TurnstileProps = {
  /** Recebe o token (ou `null` quando expira / falha / é reposto). */
  onToken: (token: string | null) => void;
  /** Mudar este valor repõe o widget (os tokens só servem uma vez). */
  resetKey?: number;
};

/**
 * Widget Cloudflare Turnstile (render explícito). Não renderiza nada se
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` não estiver definido (desenvolvimento).
 */
export function Turnstile({ onToken, resetKey = 0 }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const renderWidget = useCallback(() => {
    if (!TURNSTILE_SITE_KEY || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current !== undefined) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "light",
      language: "pt",
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(null),
      "error-callback": () => onTokenRef.current(null),
    });
  }, []);

  // Script já carregado (ex.: voltar ao formulário) → renderiza logo.
  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetIdRef.current !== undefined) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      }
    };
  }, [renderWidget]);

  const lastResetKeyRef = useRef(resetKey);
  useEffect(() => {
    if (resetKey === lastResetKeyRef.current) return;
    lastResetKeyRef.current = resetKey;
    if (widgetIdRef.current === undefined) return;
    window.turnstile?.reset(widgetIdRef.current);
    onTokenRef.current(null);
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
      />
      <div ref={containerRef} className="flex min-h-[66px] items-center justify-center" />
    </>
  );
}
