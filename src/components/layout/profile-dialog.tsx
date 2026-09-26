"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import Image from "next/image";
import { Camera, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const profileSchema = z.object({
  full_name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
});

type ProfileValues = z.infer<typeof profileSchema>;

function Feedback({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  return (
    <p
      className={`flex items-center gap-1.5 text-sm ${
        type === "success" ? "text-green-500" : "text-destructive"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {message}
    </p>
  );
}

type ProfileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  currentAvatarUrl: string | null;
  onProfileUpdated: (name: string, avatarUrl: string | null) => void;
};

export function ProfileDialog({
  open,
  onOpenChange,
  currentName,
  currentAvatarUrl,
  onProfileUpdated,
}: ProfileDialogProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    currentAvatarUrl,
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: currentName },
  });

  const onProfileSave = async (values: ProfileValues) => {
    setProfileStatus(null);
    setAvatarError(null);

    let avatarUrl = currentAvatarUrl;

    if (avatarFile) {
      const form = new FormData();
      form.append("file", avatarFile);

      const res = await fetch("/api/upload-avatar", { method: "POST", body: form });
      const json = (await res.json()) as { url?: string; error?: string };

      if (!res.ok) {
        setProfileStatus({ type: "error", message: "Erro ao carregar a imagem." });
        return;
      }

      avatarUrl = json.url ?? null;
    }

    const { error } = await supabase.auth.updateUser({
      data: { full_name: values.full_name, avatar_url: avatarUrl },
    });

    if (error) {
      setProfileStatus({ type: "error", message: "Erro ao guardar o perfil." });
      return;
    }

    setProfileStatus({ type: "success", message: "Perfil atualizado com sucesso." });
    onProfileUpdated(values.full_name, avatarUrl);
    setAvatarFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("A imagem deve ter menos de 2MB.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Perfil</DialogTitle>
          <DialogDescription>
            Edita o teu nome e foto de perfil.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleProfileSubmit(onProfileSave)} className="space-y-4">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative h-20 w-20 overflow-hidden rounded-full bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Alterar foto de perfil"
            >
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Foto de perfil"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
                  {currentName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          {avatarError && <Feedback type="error" message={avatarError} />}

          <div className="grid gap-1.5">
            <Label htmlFor="full_name">Nome</Label>
            <Input
              id="full_name"
              {...regProfile("full_name")}
              placeholder="O teu nome"
              autoComplete="name"
            />
            {profileErrors.full_name && (
              <p className="text-sm text-destructive">
                {profileErrors.full_name.message}
              </p>
            )}
          </div>

          {profileStatus && (
            <Feedback type={profileStatus.type} message={profileStatus.message} />
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isProfileSubmitting}
          >
            {isProfileSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Guardar perfil
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
