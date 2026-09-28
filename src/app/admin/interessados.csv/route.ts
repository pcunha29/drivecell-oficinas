import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvResponseHeaders, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Exporta a lista de interessados em CSV (só admin). */
export async function GET() {
  const user = await getAdminUser();
  if (!user) return new NextResponse("Sem permissão.", { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("interessados")
    .select("email, created_at, contacted_at, source")
    .order("created_at", { ascending: true });
  if (error) return new NextResponse(error.message, { status: 500 });

  const date = new Date().toISOString().slice(0, 10);
  const csv = toCsv(
    ["email", "registado_em", "contactado_em", "origem"],
    (data ?? []).map((r) => [r.email, r.created_at, r.contacted_at, r.source]),
  );
  return new NextResponse(csv, { headers: csvResponseHeaders(`interessados-${date}.csv`) });
}
