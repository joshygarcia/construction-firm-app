"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 15;

export function useTableControls<T>(
  items: T[],
  searchKeys: (keyof T)[],
) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLocaleLowerCase();
    return items.filter((item) =>
      searchKeys.some((key) => {
        const val = item[key];
        return typeof val === "string" && val.toLocaleLowerCase().includes(q);
      }),
    );
  }, [items, query, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goToPage = useCallback((p: number) => setPage(Math.max(1, Math.min(p, totalPages))), [totalPages]);

  return {
    query,
    setQuery: (q: string) => { setQuery(q); setPage(1); },
    page: safePage,
    totalPages,
    goToPage,
    filtered,
    paginated,
    totalFiltered: filtered.length,
  };
}

export function SearchBar({
  query,
  onQueryChange,
  placeholder = "Buscar...",
}: {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full max-w-xs">
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-8"
        placeholder={placeholder}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm text-muted-foreground">
        {totalItems} resultado{totalItems !== 1 ? "s" : ""}
        {" · "}Página {page} de {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          size="icon-sm"
          variant="outline"
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          size="icon-sm"
          variant="outline"
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
