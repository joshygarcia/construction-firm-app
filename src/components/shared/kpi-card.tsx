import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function KpiCard({
  title,
  value,
  hint,
  delta,
  trend = "neutral",
}: {
  title: string;
  value: number;
  hint: string;
  delta?: number;
  trend?: "positive" | "negative" | "neutral";
}) {
  const TrendIcon =
    trend === "positive" ? ArrowUpIcon : trend === "negative" ? ArrowDownIcon : MinusIcon;

  const valueTone =
    trend === "positive"
      ? "text-[var(--positive)]"
      : trend === "negative"
        ? "text-[var(--negative)]"
        : "text-foreground";

  return (
    <Card className="rounded-2xl border-border/70 bg-card shadow-[var(--shadow-card)]">
      <CardHeader className="pt-5">
        <CardTitle className="text-[13px] font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p
              className={cn(
                "font-heading text-[26px] font-semibold tabular-nums tracking-tight xl:text-[30px]",
                valueTone,
              )}
            >
              {formatCurrency(value)}
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">{hint}</p>
          </div>
          {delta !== undefined ? (
            <Badge
              variant="secondary"
              className="gap-1 rounded-full tabular-nums"
            >
              <TrendIcon data-icon="inline-start" />
              {formatPercent(delta)}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
