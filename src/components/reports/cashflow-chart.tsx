"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { CashflowRow } from "@/features/finance/ledger";
import { formatCurrency, formatMonthKey } from "@/lib/format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  totalIncome: {
    label: "Ingresos",
    color: "var(--chart-2)",
  },
  totalExpense: {
    label: "Gastos",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function CashflowChart({ data }: { data: CashflowRow[] }) {
  return (
    <ChartContainer className="h-72 w-full" config={chartConfig}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="monthKey"
          tickFormatter={formatMonthKey}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          tickFormatter={(value) => formatCurrency(value).replace(",00", "")}
          tickLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
        <Bar dataKey="totalIncome" fill="var(--color-totalIncome)" radius={8} />
        <Bar dataKey="totalExpense" fill="var(--color-totalExpense)" radius={8} />
      </BarChart>
    </ChartContainer>
  );
}
