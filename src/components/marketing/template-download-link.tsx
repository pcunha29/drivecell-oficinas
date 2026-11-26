"use client";

import type { AnchorHTMLAttributes } from "react";
import { trackTemplateDownload, type TemplateFormat } from "@/lib/analytics/events";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  modelo: string;
  formato: TemplateFormat;
};

/** Link de download de um modelo grátis, que regista o formato descarregado. */
export function TemplateDownloadLink({ modelo, formato, onClick, ...props }: Props) {
  return (
    <a
      download
      {...props}
      onClick={(e) => {
        trackTemplateDownload(modelo, formato);
        onClick?.(e);
      }}
    />
  );
}
