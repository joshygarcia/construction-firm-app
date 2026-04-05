"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, LoaderCircleIcon, PlusIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CreatableOption = {
  value: string;
  label: string;
};

type CreatableComboboxProps = {
  value: string;
  options: CreatableOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage?: string;
  createLabel?: string;
  clearLabel?: string;
  disabled?: boolean;
  allowClear?: boolean;
  onChange: (value: string) => void;
  onCreate?: (query: string) => Promise<CreatableOption | null>;
};

function normalizeLookupValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function CreatableCombobox({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage = "No hay opciones disponibles.",
  createLabel = "Crear",
  clearLabel = "Limpiar seleccion",
  disabled = false,
  allowClear = false,
  onChange,
  onCreate,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );
  const normalizedQuery = normalizeLookupValue(query);
  const hasExactMatch = options.some(
    (option) => normalizeLookupValue(option.label) === normalizedQuery,
  );
  const canCreate = Boolean(onCreate && normalizedQuery && !hasExactMatch);

  async function handleCreate() {
    if (!onCreate || !normalizedQuery) {
      return;
    }

    setIsCreating(true);

    try {
      const createdOption = await onCreate(query);

      if (!createdOption) {
        return;
      }

      onChange(createdOption.value);
      setOpen(false);
      setQuery("");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        aria-expanded={open}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "w-full justify-between gap-2 px-3 font-normal",
          !selectedOption && "text-muted-foreground",
        )}
        disabled={disabled}
        type="button"
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(28rem,calc(100vw-2rem))] p-0">
        <Command shouldFilter>
          <CommandInput
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
            value={query}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {canCreate ? (
              <CommandGroup heading="Crear">
                <CommandItem disabled={isCreating} onSelect={() => void handleCreate()}>
                  {isCreating ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : (
                    <PlusIcon className="size-4" />
                  )}
                  {createLabel} <span>&quot;{query.trim()}&quot;</span>
                </CommandItem>
              </CommandGroup>
            ) : null}
            {canCreate && (allowClear || options.length > 0) ? <CommandSeparator /> : null}
            {allowClear && value ? (
              <CommandGroup heading="Seleccion">
                <CommandItem
                  onSelect={() => {
                    onChange("");
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {clearLabel}
                </CommandItem>
              </CommandGroup>
            ) : null}
            {allowClear && value && options.length > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading="Opciones">
              {options.map((option) => (
                <CommandItem
                  data-checked={option.value === value ? true : undefined}
                  key={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  value={option.label}
                >
                  <CheckIcon
                    className={cn(
                      "size-4 text-primary transition-opacity",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
