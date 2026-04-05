import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/50 px-4 py-6 md:px-6 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl">
        <div className="flex items-center gap-2">
          <div className="h-[3px] w-4 rounded-full bg-copper/60" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-copper">
            {eyebrow}
          </p>
        </div>
        <h1 className="mt-1.5 font-heading text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-[15px]">
          {description}
        </p>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
