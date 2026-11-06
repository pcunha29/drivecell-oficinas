"use client";

import type { ComponentProps } from "react";
import { ButtonLink } from "@/components/marketing/button-link";
import { trackDemoCta, type DemoCtaOrigin } from "@/lib/analytics/events";

type Props = ComponentProps<typeof ButtonLink> & { origin: DemoCtaOrigin };

/** Botão "Pedir demonstração" que leva à secção de contacto e regista o clique. */
export function TrackedCtaLink({ origin, onClick, ...props }: Props) {
  return (
    <ButtonLink
      {...props}
      onClick={(e) => {
        trackDemoCta(origin);
        onClick?.(e);
      }}
    />
  );
}
