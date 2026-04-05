import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";

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

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 shadow-sm backdrop-blur-sm">
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-copper/60 via-copper/30 to-transparent" />
      <CardHeader className="gap-2 pt-5">
        <CardTitle className="font-mono text-[11px] font-normal uppercase tracking-[0.15em] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-heading text-2xl font-semibold tabular-nums tracking-tight text-foreground xl:text-3xl">
              {formatCurrency(value)}
            </p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">{hint}</p>
          </div>
          {delta !== undefined ? (
            <Badge variant="secondary" className="gap-1 font-mono tabular-nums">
              <TrendIcon data-icon="inline-start" />
              {formatPercent(delta)}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
