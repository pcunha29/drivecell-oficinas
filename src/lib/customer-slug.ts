/** Slugs de cliente gerados pela base de dados: `c-1`, `c-2`… por oficina. */
const SLUG_PATTERN = /^c-(\d+)$/;

export function isCustomerSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

/** Número do slug (`c-12` → 12), ou `null` se não seguir o padrão. */
export function customerSlugNumber(slug: string): number | null {
  const match = SLUG_PATTERN.exec(slug);
  return match ? Number.parseInt(match[1], 10) : null;
}

/** Ordena `c-2` antes de `c-10` (a ordenação de texto da BD não o faz). */
export function compareCustomerSlugs(a: string, b: string): number {
  const na = customerSlugNumber(a);
  const nb = customerSlugNumber(b);
  if (na !== null && nb !== null) return na - nb;
  if (na !== null) return -1;
  if (nb !== null) return 1;
  return a.localeCompare(b, "pt");
}
