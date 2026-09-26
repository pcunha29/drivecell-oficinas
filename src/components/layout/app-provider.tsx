"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useOrderStore } from "@/stores/order-store";
import { useCustomerStore } from "@/stores/customer-store";
import { useVehicleStore } from "@/stores/vehicle-store";
import { useWorkshopStore } from "@/stores/workshop-store";
import { WorkshopBanner } from "@/components/layout/workshop-banner";
import { createClient } from "@/lib/supabase/client";
import { pageContainer } from "@/lib/layout";
import { cn } from "@/lib/utils";

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadOrders = useOrderStore((s) => s.load);
  const loadCustomers = useCustomerStore((s) => s.load);
  const loadVehicles = useVehicleStore((s) => s.load);
  const loadWorkshop = useWorkshopStore((s) => s.load);
  const ordersLoading = useOrderStore((s) => s.isLoading);
  const customersLoading = useCustomerStore((s) => s.isLoading);
  const vehiclesLoading = useVehicleStore((s) => s.isLoading);
  const workshopLoading = useWorkshopStore((s) => s.isLoading);

  useEffect(() => {
    const supabase = createClient();

    const verifyAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.replace("/entrar");
        return;
      }

      await Promise.all([
        loadWorkshop(),
        loadOrders(),
        loadCustomers(),
        loadVehicles(),
      ]);
      setIsAuthenticated(true);
    };

    void verifyAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.replace("/entrar");
      }
    });

    return () => subscription.unsubscribe();
  }, [loadWorkshop, loadOrders, loadCustomers, loadVehicles]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-base text-muted-foreground">A verificar sessão...</p>
      </div>
    );
  }

  const isLoading =
    workshopLoading || ordersLoading || customersLoading || vehiclesLoading;

  return (
    <div className="flex min-h-screen flex-col pt-safe">
      <Header />
      <WorkshopBanner />
      <main
        className={cn(
          pageContainer,
          "flex-1 py-5 pb-24 md:py-8 md:pb-8",
        )}
      >
        {isLoading ? (
          <p className="py-16 text-center text-base text-muted-foreground">
            A carregar dados...
          </p>
        ) : (
          children
        )}
      </main>
      <MobileNav />
    </div>
  );
}

/** Shell da aplicação autenticada (usado apenas em /app/*). */
export function AppProvider({ children }: { children: React.ReactNode }) {
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
