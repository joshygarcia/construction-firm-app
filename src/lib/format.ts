const currencyFormatter = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("es-DO", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("es-DO", {
  dateStyle: "medium",
});

const monthFormatter = new Intl.DateTimeFormat("es-DO", {
  month: "long",
  year: "numeric",
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatCompactCurrency(value: number) {
  return compactFormatter.format(value);
}

export function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

export function formatMonthKey(monthKey: string) {
  return monthFormatter.format(new Date(`${monthKey}-01T00:00:00`));
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}
