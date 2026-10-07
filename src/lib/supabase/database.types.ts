export type OrderStatusDb =
  | "waiting"
  | "in_progress"
  | "done"
  | "delivered";

export type SubscriptionStatusDb =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export type WorkshopRow = {
  id: string;
  name: string;
  phone: string | null;
  nif: string | null;
  customer_seq: number;
  subscription_status: SubscriptionStatusDb;
  trial_ends_at: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  terms_version: string | null;
  terms_accepted_at: string | null;
  is_demo: boolean;
  /** A oficina regista o custo das peças (margem). */
  track_costs: boolean;
  admin_notes: string;
  created_at: string;
};

export type WorkshopMemberRow = {
  workshop_id: string;
  user_id: string;
  role: "owner" | "member";
};

export type CustomerRow = {
  id: string;
  workshop_id: string;
  slug: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type VehicleRow = {
  id: string;
  workshop_id: string;
  customer_id: string;
  plate: string;
  make: string;
  model: string;
  year: number | null;
  created_at: string;
  updated_at: string;
};

export type ServiceOrderRow = {
  id: string;
  workshop_id: string;
  customer_id: string;
  vehicle_id: string;
  status: OrderStatusDb;
  description: string;
  notes: string;
  paid: boolean;
  created_at: string;
  updated_at: string;
  /** Podem faltar se a migração de entrada/saída ainda não foi aplicada. */
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  service_order_items?: ServiceOrderItemRow[];
};

export type ServiceOrderItemRow = {
  id: string;
  workshop_id: string;
  order_id: string;
  position: number;
  description: string;
  quantity: number;
  unit_price: number;
  unit_cost: number | null;
  created_at: string;
};
