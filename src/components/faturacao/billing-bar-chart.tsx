"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { MonthData } from "@/lib/billing";
import { formatEuro } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BillingBarChartProps = {
  data: MonthData[];
  emptyMessage?: string;
};

export function BillingBarChart({ data, emptyMessage = "Sem dados" }: BillingBarChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Valores faturados por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
            {emptyMessage}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">Valores faturados por mês</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v} €`}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                }}
                labelStyle={{ color: "var(--card-foreground)" }}
                formatter={(value) => [formatEuro(Number(value ?? 0)), "Faturado"]}
                labelFormatter={(_, payload) => {
                  const d = payload[0]?.payload as MonthData;
                  return d ? `${d.monthLabel} ${d.year}` : "";
                }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill="var(--chart-revenue)"
                  />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
