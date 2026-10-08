"use client";

import { useActionState, useState } from "react";
import { adminLoginAction, type AdminLoginState } from "@/app/admin/entrar/actions";
import { GOOGLE_ENABLED, GoogleIcon } from "@/components/auth/google-icon";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AdminLoginState = { error: null, email: "" };

export function AdminLoginForm({ initialError = null }: { initialError?: string | null }) {
  const [state, formAction, pending] = useActionState(adminLoginAction, { ...initialState, error: initialError });
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const error = googleError ?? state.error;

  const onGoogle = async () => {
    setGoogleError(null);
    setGoogleLoading(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/admin")}`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      setGoogleLoading(false);
      setGoogleError("Não foi possível abrir o login da Google. Tenta outra vez.");
    }
  };

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {GOOGLE_ENABLED && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onGoogle}
            disabled={pending || googleLoading}
            className="min-h-[44px]"
          >
            <GoogleIcon />
            {googleLoading ? "A abrir a Google…" : "Continuar com Google"}
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
            <div className="h-px grow bg-border" />
            <span>ou com email</span>
            <div className="h-px grow bg-border" />
          </div>
        </>
      )}
      <div className="grid gap-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={state.email}
          required
          autoFocus
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="admin-password">Palavra-passe</Label>
        <Input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div role="alert" className="empty:hidden">
        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending || googleLoading} className="min-h-[44px]">
        {pending ? "A entrar…" : "Entrar"}
      </Button>
    </form>
  );
}
