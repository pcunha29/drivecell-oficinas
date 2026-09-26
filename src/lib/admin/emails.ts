/** Emails com acesso a /admin: ADMIN_EMAILS="a@x.pt,b@y.pt" (sem distinção de maiúsculas). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}
