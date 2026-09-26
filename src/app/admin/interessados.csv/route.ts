import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Protege contra fórmulas ao abrir no Excel e escapa aspas. */
function csvCell(value: string | null): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}

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

  const rows = [
    ["email", "registado_em", "contactado_em", "origem"].map(csvCell).join(";"),
    ...(data ?? []).map((r) =>
      [r.email, r.created_at, r.contacted_at, r.source].map((v) => csvCell(v as string | null)).join(";"),
    ),
  ];
  const date = new Date().toISOString().slice(0, 10);

  // BOM para o Excel reconhecer UTF-8; ";" é o separador por omissão em pt-PT.
  return new NextResponse(`﻿${rows.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="interessados-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
