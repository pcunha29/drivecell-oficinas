/** Aceita apenas caminhos internos (evita redirecionamentos abertos). */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/app",
): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return fallback;
  }
  return next;
}
