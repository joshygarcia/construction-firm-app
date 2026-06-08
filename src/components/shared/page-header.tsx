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
        "flex flex-col gap-4 px-4 py-7 md:px-8 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl">
        <p className="text-[13px] font-medium text-copper">{eyebrow}</p>
        <h1 className="mt-1 font-heading text-[28px] font-semibold tracking-tight text-foreground md:text-[32px]">
          {title}
        </h1>
        <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
