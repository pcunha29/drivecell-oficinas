/**
 * Injeta dados de demo no Supabase.
 * Requer SUPABASE_SERVICE_ROLE_KEY em .env.local (Settings → API → service_role).
 *
 * Uso: npm run db:seed
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!url) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL em .env.local");
  process.exit(1);
}
if (!serviceKey) {
  console.error(
    "Falta SUPABASE_SERVICE_ROLE_KEY em .env.local (Supabase → Settings → API → service_role).",
  );
  console.error(
    "Alternativa: abre supabase/seed.sql e corre no SQL Editor do Supabase.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CUSTOMERS = [
  {
    id: "a0000000-0000-4000-8000-000000000101",
    slug: "bg-0",
    name: "Roberto Mendes",
    phone: "915 678 901",
    email: "roberto.mendes@email.pt",
    notes: "Frota - 4 veículos",
  },
  {
    id: "a0000000-0000-4000-8000-000000000102",
    slug: "bg-1",
    name: "Ana Paula Silva",
    phone: "912 345 678",
    email: "ana.silva@email.pt",
    notes: "Prefere contacto por WhatsApp",
  },
  {
    id: "a0000000-0000-4000-8000-000000000103",
    slug: "bg-2",
    name: "Carlos Eduardo Santos",
    phone: "913 456 789",
    email: "carlos.santos@email.pt",
    notes: "",
  },
];

const VEHICLES = [
  {
    id: "a0000000-0000-4000-8000-000000000201",
    customer_id: "a0000000-0000-4000-8000-000000000101",
    plate: "12-AB-34",
    make: "Volkswagen",
    model: "Golf",
    year: 2018,
  },
  {
    id: "a0000000-0000-4000-8000-000000000202",
    customer_id: "a0000000-0000-4000-8000-000000000101",
    plate: "56-CD-78",
    make: "Ford",
    model: "Transit",
    year: 2020,
  },
  {
    id: "a0000000-0000-4000-8000-000000000203",
    customer_id: "a0000000-0000-4000-8000-000000000101",
    plate: "90-EF-12",
    make: "Renault",
    model: "Clio",
    year: 2019,
  },
  {
    id: "a0000000-0000-4000-8000-000000000204",
    customer_id: "a0000000-0000-4000-8000-000000000101",
    plate: "34-GH-56",
    make: "Peugeot",
    model: "308",
    year: 2021,
  },
  {
    id: "a0000000-0000-4000-8000-000000000205",
    customer_id: "a0000000-0000-4000-8000-000000000102",
    plate: "78-IJ-90",
    make: "Toyota",
    model: "Yaris",
    year: 2017,
  },
  {
    id: "a0000000-0000-4000-8000-000000000206",
    customer_id: "a0000000-0000-4000-8000-000000000103",
    plate: "11-KL-22",
    make: "BMW",
    model: "320d",
    year: 2016,
  },
];

const ORDER_IDS = [
  "a0000000-0000-4000-8000-000000000301",
  "a0000000-0000-4000-8000-000000000302",
  "a0000000-0000-4000-8000-000000000303",
  "a0000000-0000-4000-8000-000000000304",
  "a0000000-0000-4000-8000-000000000305",
  "a0000000-0000-4000-8000-000000000306",
];

const ORDERS = [
  {
    id: ORDER_IDS[0],
    customer_id: "a0000000-0000-4000-8000-000000000101",
    vehicle_id: "a0000000-0000-4000-8000-000000000201",
    status: "waiting",
    description: "Troca de pastilhas e discos dianteiros",
  },
  {
    id: ORDER_IDS[1],
    customer_id: "a0000000-0000-4000-8000-000000000102",
    vehicle_id: "a0000000-0000-4000-8000-000000000205",
    status: "waiting",
    description: "Revisão completa do sistema de travões",
  },
  {
    id: ORDER_IDS[2],
    customer_id: "a0000000-0000-4000-8000-000000000101",
    vehicle_id: "a0000000-0000-4000-8000-000000000202",
    status: "in_progress",
    description: "Pastilhas traseiras - Ford Transit",
  },
  {
    id: ORDER_IDS[3],
    customer_id: "a0000000-0000-4000-8000-000000000103",
    vehicle_id: "a0000000-0000-4000-8000-000000000206",
    status: "in_progress",
    description: "Desgaste irregular - verificar pinças",
  },
  {
    id: ORDER_IDS[4],
    customer_id: "a0000000-0000-4000-8000-000000000101",
    vehicle_id: "a0000000-0000-4000-8000-000000000203",
    status: "done",
    description: "Substituição de discos dianteiros",
  },
  {
    id: ORDER_IDS[5],
    customer_id: "a0000000-0000-4000-8000-000000000101",
    vehicle_id: "a0000000-0000-4000-8000-000000000204",
    status: "delivered",
    description: "Purga e troca de líquido de travões",
  },
];

const ITEMS = [
  {
    order_id: ORDER_IDS[0],
    description: "Pastilhas dianteiras",
    quantity: 1,
    unit_price: 180,
  },
  {
    order_id: ORDER_IDS[0],
    description: "Discos dianteiros",
    quantity: 2,
    unit_price: 220,
  },
  {
    order_id: ORDER_IDS[0],
    description: "Mão de obra",
    quantity: 1,
    unit_price: 250,
  },
  {
    order_id: ORDER_IDS[1],
    description: "Revisão travões",
    quantity: 1,
    unit_price: 120,
  },
  {
    order_id: ORDER_IDS[1],
    description: "Líquido de travões",
    quantity: 1,
    unit_price: 45,
  },
  {
    order_id: ORDER_IDS[2],
    description: "Pastilhas traseiras",
    quantity: 1,
    unit_price: 150,
  },
  {
    order_id: ORDER_IDS[2],
    description: "Mão de obra",
    quantity: 1,
    unit_price: 180,
  },
  {
    order_id: ORDER_IDS[3],
    description: "Diagnóstico pinças",
    quantity: 1,
    unit_price: 80,
  },
  {
    order_id: ORDER_IDS[3],
    description: "Reparação pinça direita",
    quantity: 1,
    unit_price: 140,
  },
  {
    order_id: ORDER_IDS[4],
    description: "Discos dianteiros",
    quantity: 2,
    unit_price: 210,
  },
  {
    order_id: ORDER_IDS[4],
    description: "Mão de obra",
    quantity: 1,
    unit_price: 200,
  },
  {
    order_id: ORDER_IDS[5],
    description: "Líquido de travões",
    quantity: 2,
    unit_price: 35,
  },
  {
    order_id: ORDER_IDS[5],
    description: "Purga do sistema",
    quantity: 1,
    unit_price: 90,
  },
  {
    order_id: ORDER_IDS[5],
    description: "Mão de obra",
    quantity: 1,
    unit_price: 120,
  },
];

async function clearSeed() {
  await supabase.from("service_order_items").delete().in("order_id", ORDER_IDS);
  await supabase.from("service_orders").delete().in("id", ORDER_IDS);
  await supabase
    .from("vehicles")
    .delete()
    .in(
      "id",
      VEHICLES.map((v) => v.id),
    );
  await supabase
    .from("customers")
    .delete()
    .in(
      "id",
      CUSTOMERS.map((c) => c.id),
    );
}

async function main() {
  console.log("A limpar seed anterior...");
  await clearSeed();

  console.log("A inserir clientes...");
  const { error: cErr } = await supabase.from("customers").insert(CUSTOMERS);
  if (cErr) throw cErr;

  console.log("A inserir veículos...");
  const { error: vErr } = await supabase.from("vehicles").insert(VEHICLES);
  if (vErr) throw vErr;

  console.log("A inserir ordens...");
  const { error: oErr } = await supabase.from("service_orders").insert(ORDERS);
  if (oErr) throw oErr;

  console.log("A inserir itens...");
  const { error: iErr } = await supabase
    .from("service_order_items")
    .insert(ITEMS);
  if (iErr) throw iErr;

  console.log("Seed concluído:");
  console.log("  3 clientes");
  console.log("  6 veículos (Roberto Mendes: 4)");
  console.log(
    "  6 ordens - 2 em espera, 2 em andamento, 1 concluída, 1 entregue",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
