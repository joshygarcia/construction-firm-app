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
  PlusIcon,
  Settings2Icon,
  TagIcon,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

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
    { href: "/precios", label: "Tabla de precios", icon: TagIcon },
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
        <SidebarHeader className="gap-3 px-3 py-4">
          <div className="flex items-center gap-3 px-1">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <span className="font-heading text-sm font-bold">CC</span>
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-[15px] font-semibold text-sidebar-foreground">
                {projectName}
              </p>
              <Link
                href="/projects"
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeftIcon className="size-3" />
                Cambiar proyecto
              </Link>
            </div>
          </div>
          <Link
            href={`/projects/${projectId}/registrar`}
            className={cn(
              buttonVariants({ size: "default" }),
              "w-full justify-center gap-2 rounded-xl shadow-sm",
            )}
          >
            <PlusIcon className="size-4" />
            Registrar
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
                            className={cn("rounded-xl", isActive && "font-medium")}
                          >
                            <item.icon data-icon="inline-start" className={isActive ? "text-primary" : "text-muted-foreground"} />
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
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger />
            <div className="h-4 w-px bg-border" />
            <p className="truncate text-sm font-medium text-foreground">{projectName}</p>
          </div>
          <span className="hidden rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground md:inline">
            RD$ · DOP
          </span>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
