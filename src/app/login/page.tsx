import { redirect } from "next/navigation";

/** Rota antiga: o login vive agora em /entrar. Mantém `?error` e `?next`. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["error", "next"] as const) {
    const raw = params[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  redirect(qs ? `/entrar?${qs}` : "/entrar");
}
