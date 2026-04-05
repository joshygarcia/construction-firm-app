"use client";

import { Cell, Pie, PieChart } from "recharts";

import { formatCurrency } from "@/lib/format";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const chartConfig = {
  actual: {
    label: "Gasto real",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const palette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function CategorySpendChart({
  data,
}: {
  data: Array<{ name: string; actual: number }>;
}) {
  return (
    <ChartContainer className="h-72 w-full" config={chartConfig}>
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="text-muted-foreground">{String(name)}</span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatCurrency(Number(value))}
                  </span>
                </div>
              )}
              hideIndicator
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" />
        <Pie
          data={data}
          dataKey="actual"
          innerRadius={64}
          nameKey="name"
          outerRadius={100}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={palette[index % palette.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
