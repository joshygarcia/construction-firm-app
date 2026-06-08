"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftIcon,
  BanknoteIcon,
  BarChart3Icon,
  Building2Icon,
  ClipboardListIcon,
  CreditCardIcon,
  FileTextIcon,
  LineChartIcon,
  Settings2Icon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

function getNavItems(projectId: string) {
  return [
    { href: `/projects/${projectId}`, label: "Panel", icon: BarChart3Icon, exact: true },
    { href: `/projects/${projectId}/transactions`, label: "Movimientos", icon: CreditCardIcon },
    { href: `/projects/${projectId}/budgets`, label: "Presupuesto", icon: ClipboardListIcon },
    { href: `/projects/${projectId}/contractors`, label: "Contratistas", icon: Building2Icon },
    { href: `/projects/${projectId}/invoices`, label: "Facturas y recibos", icon: FileTextIcon },
    { href: `/projects/${projectId}/reports`, label: "Reportes", icon: LineChartIcon },
    { href: "/finanzas", label: "Finanzas", icon: BanknoteIcon },
    { href: "/settings", label: "Ajustes", icon: Settings2Icon },
  ];
}

export function ProjectShell({
  children,
  projectId,
  projectName,
}: {
  children: React.ReactNode;
  projectId: string;
  projectName: string;
}) {
  const pathname = usePathname();
  const navItems = getNavItems(projectId);

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset">
        <SidebarHeader className="gap-4 px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary/90 to-sidebar-primary/60">
              <span className="font-heading text-sm font-bold text-sidebar-primary-foreground">
                CC
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-heading text-[15px] font-semibold text-sidebar-foreground truncate">
                {projectName}
              </p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-sidebar-foreground/40">
                Control Central
              </p>
            </div>
          </div>
          <Link
            href="/projects"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <ArrowLeftIcon className="size-3.5" />
            Cambiar proyecto
          </Link>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={
                          <Link
                            href={item.href}
                            className={isActive ? "border-l-2 border-sidebar-primary !rounded-l-none" : ""}
                          >
                            <item.icon data-icon="inline-start" className={isActive ? "text-sidebar-primary" : ""} />
                            <span>{item.label}</span>
                          </Link>
                        }
                        isActive={isActive}
                        tooltip={item.label}
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-3 px-4 py-4">
          <SidebarSeparator className="mx-0" />
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/40">
            Control Central
          </p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="overflow-hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur-md md:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <div className="h-4 w-px bg-border/70" />
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Contabilidad ledger-first
            </p>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <div className="h-1.5 w-1.5 rounded-full bg-copper/70" />
            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              es-DO / DOP
            </span>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
