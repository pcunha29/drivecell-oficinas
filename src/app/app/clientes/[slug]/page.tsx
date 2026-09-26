"use client";

import { useParams } from "next/navigation";
import { CustomerDetail } from "@/components/customers/customer-detail";

export default function CustomerDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";

  if (!slug) {
    return null;
  }

  return <CustomerDetail customerSlug={slug} />;
}
