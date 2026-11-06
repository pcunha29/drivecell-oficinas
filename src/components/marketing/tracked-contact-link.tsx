"use client";

import type { AnchorHTMLAttributes } from "react";
import { tagContactLink, trackDemoRequest, type DemoChannel, type DemoOrigin } from "@/lib/analytics/events";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  channel: DemoChannel;
  origin: DemoOrigin;
};

/**
 * Link de contacto (WhatsApp/email) que regista o pedido de demonstração e acrescenta à
 * mensagem de onde veio o contacto (ex.: "(Google · preços)").
 */
export function TrackedContactLink({ channel, origin, onClick, ...props }: Props) {
  return (
    <a
      {...props}
      onClick={(e) => {
        tagContactLink(e.currentTarget);
        trackDemoRequest(channel, origin);
        onClick?.(e);
      }}
    />
  );
}
