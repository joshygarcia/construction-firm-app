"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { BudgetVsActualRow } from "@/features/finance/ledger";
import { formatCurrency } from "@/lib/format";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  budgeted: {
    label: "Presupuestado",
    color: "var(--chart-1)",
  },
  actual: {
    label: "Real",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function BudgetVsActualChart({ data }: { data: BudgetVsActualRow[] }) {
  const topRows = data.slice(0, 6).map((row) => ({
    ...row,
    name: row.subcategoryName === "Sin subcategoría" ? row.categoryName : row.subcategoryName,
  }));

  return (
    <ChartContainer className="h-80 w-full" config={chartConfig}>
      <BarChart data={topRows}>
        <CartesianGrid vertical={false} />
        <XAxis axisLine={false} dataKey="name" tickLine={false} />
        <YAxis
          axisLine={false}
          tickFormatter={(value) => formatCurrency(value).replace(",00", "")}
          tickLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="budgeted" fill="var(--color-budgeted)" radius={8} />
        <Bar dataKey="actual" fill="var(--color-actual)" radius={8} />
      </BarChart>
    </ChartContainer>
  );
}
