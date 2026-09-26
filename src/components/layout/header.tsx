"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getStripeBillingPortalUrl } from "@/lib/stripe";
import { getUserDisplayName } from "@/lib/supabase/user-display-name";
import {
  LayoutDashboard,
  Users,
  Car,
  BarChart3,
  LogOut,
  ChevronDown,
  UserCircle,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pageContainer } from "@/lib/layout";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileDialog } from "@/components/layout/profile-dialog";
import { useWorkshop } from "@/stores/workshop-store";
import { DrivecellIcon } from "@/components/brand/drivecell-logo";

const navItems = [
  { href: "/app", label: "Quadro", icon: LayoutDashboard },
  { href: "/app/clientes", label: "Clientes", icon: Users },
  { href: "/app/viaturas", label: "Viaturas", icon: Car },
];

function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "D";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

function DemoBadge() {
  return (
    <span
      className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
      title="Oficina de demonstração"
    >
      Demo
    </span>
  );
}

export function Header() {
  const pathname = usePathname();
  const { workshop } = useWorkshop();
  const workshopName = workshop?.name ?? "DriveCell Oficinas";
  const billingPortalUrl = getStripeBillingPortalUrl();
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserName(getUserDisplayName(data.user));
        const meta = data.user.user_metadata as Record<string, unknown> | undefined;
        setAvatarUrl(typeof meta?.avatar_url === "string" ? meta.avatar_url : null);
      }
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserName(getUserDisplayName(session.user));
        const meta = session.user.user_metadata as Record<string, unknown> | undefined;
        setAvatarUrl(typeof meta?.avatar_url === "string" ? meta.avatar_url : null);
      } else {
        setUserName(null);
        setAvatarUrl(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = () => {
    window.location.href = "/auth/signout";
  };

  return (
    <>
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className={cn(pageContainer, "flex h-14 items-center justify-between gap-4 md:h-16")}>
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-8">
          <Link
            href="/app"
            className="flex min-w-0 shrink items-center gap-2.5 touch-manipulation"
            title={workshopName}
          >
            <DrivecellIcon variant="auto" size={24} />
            <span className="h-6 w-px shrink-0 bg-border" aria-hidden />
            <span className="truncate text-base font-semibold text-foreground md:max-w-[200px] lg:max-w-[260px]">
              {workshopName}
            </span>
            {workshop?.is_demo && <DemoBadge />}
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/app"
                  ? pathname === "/app"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors touch-manipulation",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex max-w-[180px] items-center gap-2 rounded-lg px-2 py-1.5 min-h-[44px] hover:bg-muted touch-manipulation"
                aria-label="Menu do utilizador"
              >
                <div className="relative hidden h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground md:flex">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span aria-hidden>{initials(userName)}</span>
                  )}
                </div>
                <span className="hidden truncate text-sm font-medium text-foreground sm:block">
                  {userName ?? "…"}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link
                  href="/app/faturacao"
                  className="flex min-h-[44px] items-center gap-2 cursor-pointer"
                >
                  <BarChart3 className="h-4 w-4" />
                  Faturação
                </Link>
              </DropdownMenuItem>
              {billingPortalUrl && (
                <DropdownMenuItem asChild>
                  <a
                    href={billingPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-[44px] items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="h-4 w-4" />
                    Subscrição
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="flex min-h-[44px] items-center gap-2 cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  setProfileOpen(true);
                }}
              >
                <UserCircle className="h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex min-h-[44px] items-center gap-2 text-muted-foreground focus:text-destructive cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}
              >
                <LogOut className="h-4 w-4" />
                Terminar sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>

    <ProfileDialog
      open={profileOpen}
      onOpenChange={setProfileOpen}
      currentName={userName ?? ""}
      currentAvatarUrl={avatarUrl}
      onProfileUpdated={(name, url) => {
        setUserName(name);
        setAvatarUrl(url);
      }}
    />
    </>
  );
}
