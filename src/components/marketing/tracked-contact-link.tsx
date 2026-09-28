"use client";

import type { AnchorHTMLAttributes } from "react";
import { trackDemoRequest, type DemoChannel, type DemoOrigin } from "@/lib/analytics/events";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  channel: DemoChannel;
  origin: DemoOrigin;
};

/** Link de contacto (WhatsApp/email) que regista o pedido de demonstração. */
export function TrackedContactLink({ channel, origin, onClick, ...props }: Props) {
  return (
    <a
      {...props}
      onClick={(e) => {
        trackDemoRequest(channel, origin);
        onClick?.(e);
      }}
    />
  );
}
