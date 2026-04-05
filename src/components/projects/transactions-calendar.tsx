"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";

export type CalendarTransaction = {
  id: string;
  transactionDate: string; // "YYYY-MM-DD"
  amount: number;
  detail: string;
  transactionType: "expense" | "income";
  payeeOrSource: string;
};

type View = "day" | "week" | "month" | "year";

const WEEK_STARTS_ON = 1 as const; // Monday

function toKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function TransactionsCalendar({
  transactions,
}: {
  transactions: CalendarTransaction[];
}) {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarTransaction[]>();
    for (const t of transactions) {
      const list = map.get(t.transactionDate);
      if (list) list.push(t);
      else map.set(t.transactionDate, [t]);
    }
    return map;
  }, [transactions]);

  const byMonth = useMemo(() => {
    const map = new Map<string, CalendarTransaction[]>();
    for (const t of transactions) {
      const key = t.transactionDate.slice(0, 7);
      const list = map.get(key);
      if (list) list.push(t);
      else map.set(key, [t]);
    }
    return map;
  }, [transactions]);

  const range = useMemo(() => {
    if (view === "day") return { start: cursor, end: cursor };
    if (view === "week")
      return {
        start: startOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON }),
        end: endOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON }),
      };
    if (view === "month")
      return { start: startOfMonth(cursor), end: endOfMonth(cursor) };
    return { start: startOfYear(cursor), end: endOfYear(cursor) };
  }, [view, cursor]);

  const rangeTransactions = useMemo(() => {
    const startKey = toKey(range.start);
    const endKey = toKey(range.end);
    return transactions.filter(
      (t) => t.transactionDate >= startKey && t.transactionDate <= endKey,
    );
  }, [transactions, range]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of rangeTransactions) {
      if (t.transactionType === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense, count: rangeTransactions.length };
  }, [rangeTransactions]);

  const rangeLabel = useMemo(() => {
    if (view === "day") return format(cursor, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    if (view === "week") {
      const s = format(range.start, "d MMM", { locale: es });
      const e = format(range.end, "d MMM yyyy", { locale: es });
      return `${s} – ${e}`;
    }
    if (view === "month") return format(cursor, "MMMM yyyy", { locale: es });
    return format(cursor, "yyyy", { locale: es });
  }, [view, cursor, range]);

  function handlePrev() {
    setCursor((c) =>
      view === "day"
        ? subDays(c, 1)
        : view === "week"
          ? subWeeks(c, 1)
          : view === "month"
            ? subMonths(c, 1)
            : subYears(c, 1),
    );
  }

  function handleNext() {
    setCursor((c) =>
      view === "day"
        ? addDays(c, 1)
        : view === "week"
          ? addWeeks(c, 1)
          : view === "month"
            ? addMonths(c, 1)
            : addYears(c, 1),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev} aria-label="Anterior">
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext} aria-label="Siguiente">
            <ChevronRightIcon className="size-4" />
          </Button>
          <p className="ml-2 font-heading text-lg font-semibold capitalize text-foreground">
            {rangeLabel}
          </p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="day">Día</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mes</TabsTrigger>
            <TabsTrigger value="year">Año</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryTile label="Movimientos" value={String(totals.count)} />
        <SummaryTile
          label="Ingresos"
          value={formatCurrency(totals.income)}
          tone="income"
        />
        <SummaryTile
          label="Egresos"
          value={formatCurrency(totals.expense)}
          tone="expense"
        />
        <SummaryTile
          label="Neto"
          value={formatCurrency(totals.net)}
          tone={totals.net >= 0 ? "income" : "expense"}
        />
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base capitalize">{rangeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          {view === "day" && (
            <DayView date={cursor} transactions={byDate.get(toKey(cursor)) ?? []} />
          )}
          {view === "week" && (
            <WeekView
              start={range.start}
              byDate={byDate}
              onPickDay={(d) => {
                setCursor(d);
                setView("day");
              }}
            />
          )}
          {view === "month" && (
            <MonthView
              cursor={cursor}
              byDate={byDate}
              onPickDay={(d) => {
                setCursor(d);
                setView("day");
              }}
            />
          )}
          {view === "year" && (
            <YearView
              cursor={cursor}
              byMonth={byMonth}
              onPickMonth={(d) => {
                setCursor(d);
                setView("month");
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "income" | "expense";
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-heading text-lg font-semibold tabular-nums",
          tone === "income" && "text-emerald-500",
          tone === "expense" && "text-red-500",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function dayTotals(items: CalendarTransaction[]) {
  let income = 0;
  let expense = 0;
  for (const t of items) {
    if (t.transactionType === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense };
}

function MonthView({
  cursor,
  byDate,
  onPickDay,
}: {
  cursor: Date;
  byDate: Map<string, CalendarTransaction[]>;
  onPickDay: (date: Date) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    format(addDays(gridStart, i), "EEE", { locale: es }),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="px-1 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = toKey(day);
          const items = byDate.get(key) ?? [];
          const outside = !isSameMonth(day, cursor);
          const { income, expense } = dayTotals(items);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPickDay(day)}
              className={cn(
                "flex min-h-[92px] flex-col gap-1 rounded-lg border border-border/40 bg-card/40 p-1.5 text-left transition-colors hover:bg-accent/40",
                outside && "opacity-40",
                isToday(day) && "border-copper/60 ring-1 ring-copper/40",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-[11px] tabular-nums",
                    isToday(day) ? "text-copper" : "text-foreground/80",
                  )}
                >
                  {format(day, "d")}
                </span>
                {items.length > 0 && (
                  <span className="font-mono text-[9px] text-muted-foreground">
                    {items.length}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 2).map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px]",
                      t.transactionType === "income"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-red-500/10 text-red-500",
                    )}
                    title={`${t.detail} — ${formatCurrency(t.amount)}`}
                  >
                    {t.detail}
                  </div>
                ))}
                {items.length > 2 && (
                  <span className="text-[9px] text-muted-foreground">
                    +{items.length - 2} más
                  </span>
                )}
              </div>
              {(income > 0 || expense > 0) && (
                <div className="mt-auto flex flex-col text-[9px] tabular-nums leading-tight">
                  {income > 0 && (
                    <span className="text-emerald-500">+{formatCompactCurrency(income)}</span>
                  )}
                  {expense > 0 && (
                    <span className="text-red-500">-{formatCompactCurrency(expense)}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  start,
  byDate,
  onPickDay,
}: {
  start: Date;
  byDate: Map<string, CalendarTransaction[]>;
  onPickDay: (date: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
      {days.map((day) => {
        const items = byDate.get(toKey(day)) ?? [];
        const { income, expense } = dayTotals(items);
        return (
          <button
            key={toKey(day)}
            type="button"
            onClick={() => onPickDay(day)}
            className={cn(
              "flex min-h-[180px] flex-col gap-2 rounded-lg border border-border/40 bg-card/40 p-2 text-left transition-colors hover:bg-accent/40",
              isToday(day) && "border-copper/60 ring-1 ring-copper/40",
            )}
          >
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  {format(day, "EEE", { locale: es })}
                </p>
                <p
                  className={cn(
                    "font-heading text-lg font-semibold",
                    isToday(day) ? "text-copper" : "text-foreground",
                  )}
                >
                  {format(day, "d")}
                </p>
              </div>
              {items.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {items.length}
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-1">
              {items.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "truncate rounded px-1.5 py-0.5 text-[11px]",
                    t.transactionType === "income"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-red-500/10 text-red-500",
                  )}
                  title={`${t.detail} — ${formatCurrency(t.amount)}`}
                >
                  {t.detail}
                </div>
              ))}
              {items.length > 4 && (
                <span className="text-[10px] text-muted-foreground">
                  +{items.length - 4} más
                </span>
              )}
            </div>
            {(income > 0 || expense > 0) && (
              <div className="mt-auto flex flex-col gap-0.5 border-t border-border/40 pt-1 text-[10px] tabular-nums">
                {income > 0 && (
                  <span className="text-emerald-500">+{formatCompactCurrency(income)}</span>
                )}
                {expense > 0 && (
                  <span className="text-red-500">-{formatCompactCurrency(expense)}</span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DayView({
  date,
  transactions,
}: {
  date: Date;
  transactions: CalendarTransaction[];
}) {
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sin movimientos el {format(date, "d 'de' MMMM", { locale: es })}.
      </p>
    );
  }
  const sorted = [...transactions].sort((a, b) => b.amount - a.amount);
  return (
    <ul className="flex flex-col divide-y divide-border/40">
      {sorted.map((t) => {
        const Icon = t.transactionType === "income" ? ArrowDownRightIcon : ArrowUpRightIcon;
        const tone =
          t.transactionType === "income" ? "text-emerald-500" : "text-red-500";
        return (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-full",
                t.transactionType === "income" ? "bg-emerald-500/10" : "bg-red-500/10",
              )}
            >
              <Icon className={cn("size-4", tone)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{t.detail}</p>
              <p className="truncate text-xs text-muted-foreground">{t.payeeOrSource}</p>
            </div>
            <p className={cn("font-mono text-sm font-semibold tabular-nums", tone)}>
              {t.transactionType === "income" ? "+" : "-"}
              {formatCurrency(t.amount)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function YearView({
  cursor,
  byMonth,
  onPickMonth,
}: {
  cursor: Date;
  byMonth: Map<string, CalendarTransaction[]>;
  onPickMonth: (date: Date) => void;
}) {
  const start = startOfYear(cursor);
  const months = Array.from({ length: 12 }, (_, i) => addMonths(start, i));
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {months.map((month) => {
        const key = format(month, "yyyy-MM");
        const items = byMonth.get(key) ?? [];
        const { income, expense } = dayTotals(items);
        const net = income - expense;
        const isCurrentMonth = isSameMonth(month, new Date());
        return (
          <button
            key={key}
            type="button"
            onClick={() => onPickMonth(month)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border border-border/40 bg-card/40 p-4 text-left transition-colors hover:bg-accent/40",
              isCurrentMonth && "border-copper/60 ring-1 ring-copper/40",
            )}
          >
            <div className="flex items-baseline justify-between">
              <p className="font-heading text-base font-semibold capitalize text-foreground">
                {format(month, "MMMM", { locale: es })}
              </p>
              <span className="font-mono text-[10px] text-muted-foreground">
                {items.length} mov.
              </span>
            </div>
            <div className="flex flex-col gap-0.5 text-xs tabular-nums">
              <span className="text-emerald-500">+{formatCurrency(income)}</span>
              <span className="text-red-500">-{formatCurrency(expense)}</span>
            </div>
            <div className="mt-auto border-t border-border/40 pt-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
                Neto
              </p>
              <p
                className={cn(
                  "font-heading text-sm font-semibold tabular-nums",
                  net >= 0 ? "text-emerald-500" : "text-red-500",
                )}
              >
                {formatCurrency(net)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
