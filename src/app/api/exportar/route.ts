import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { csvResponseHeaders, toCsv, type CsvValue } from "@/lib/csv";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  waiting: "Em espera",
  in_progress: "Em curso",
  done: "Concluída",
  delivered: "Entregue",
};

type Tipo = "clientes" | "viaturas" | "ordens";

const isoDate = (value: string | null | undefined) => (value ? value.slice(0, 10) : "");

/**
 * Exportação dos dados da oficina (RGPD / portabilidade), para qualquer membro,
 * mesmo em só-leitura. O RLS garante que só saem os dados da oficina do utilizador.
 * GET /api/exportar?tipo=clientes|viaturas|ordens
 */
export async function GET(request: Request) {
  const tipo = new URL(request.url).searchParams.get("tipo") as Tipo | null;
  if (tipo !== "clientes" && tipo !== "viaturas" && tipo !== "ordens") {
    return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sem sessão" }, { status: 401 });

  const [customersRes, vehiclesRes] = await Promise.all([
    supabase.from("customers").select("id, slug, name, phone, email, notes, created_at").order("name"),
    supabase.from("vehicles").select("id, customer_id, plate, make, model, year, created_at").order("plate"),
  ]);
  if (customersRes.error) return NextResponse.json({ error: customersRes.error.message }, { status: 500 });
  if (vehiclesRes.error) return NextResponse.json({ error: vehiclesRes.error.message }, { status: 500 });

  const customers = customersRes.data ?? [];
  const vehicles = vehiclesRes.data ?? [];
  const customerName = new Map(customers.map((c) => [c.id as string, c.name as string]));
  const vehicleById = new Map(vehicles.map((v) => [v.id as string, v]));

  let header: string[];
  let rows: CsvValue[][];

  if (tipo === "clientes") {
    header = ["código", "nome", "telefone", "email", "notas", "viaturas", "criado_em"];
    const vehicleCount = new Map<string, number>();
    for (const v of vehicles) vehicleCount.set(v.customer_id, (vehicleCount.get(v.customer_id) ?? 0) + 1);
    rows = customers.map((c) => [c.slug, c.name, c.phone, c.email, c.notes, vehicleCount.get(c.id) ?? 0, isoDate(c.created_at)]);
  } else if (tipo === "viaturas") {
    header = ["matrícula", "marca", "modelo", "ano", "cliente", "criada_em"];
    rows = vehicles.map((v) => [v.plate, v.make, v.model, v.year, customerName.get(v.customer_id) ?? "", isoDate(v.created_at)]);
  } else {
    const { data: orders, error } = await supabase
      .from("service_orders")
      .select("id, customer_id, vehicle_id, status, description, notes, paid, created_at, service_order_items (position, description, quantity, unit_price, unit_cost)")
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Uma linha por peça/serviço; ordens sem linhas aparecem uma vez com as colunas da linha vazias.
    header = [
      "ordem", "data", "estado", "pago", "cliente", "matrícula", "descrição da ordem", "notas",
      "linha", "descrição da linha", "quantidade", "preço unitário", "custo unitário", "total da linha",
    ];
    rows = [];
    for (const o of orders ?? []) {
      const vehicle = vehicleById.get(o.vehicle_id);
      const base: CsvValue[] = [
        o.id.slice(0, 8),
        isoDate(o.created_at),
        STATUS_LABEL[o.status] ?? o.status,
        o.paid,
        customerName.get(o.customer_id) ?? "",
        vehicle?.plate ?? "",
        o.description,
        o.notes,
      ];
      const items = [...(o.service_order_items ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      if (items.length === 0) {
        rows.push([...base, "", "", "", "", "", ""]);
        continue;
      }
      items.forEach((item, i) => {
        const quantity = Number(item.quantity);
        const price = Number(item.unit_price);
        rows.push([
          ...base,
          i + 1,
          item.description,
          quantity,
          price,
          item.unit_cost == null ? null : Number(item.unit_cost),
          Math.round(quantity * price * 100) / 100,
        ]);
      });
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(header, rows), { headers: csvResponseHeaders(`drivecell-${tipo}-${date}.csv`) });
}
