"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Role } from "@/lib/constants";
import { Logo } from "./logo";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

type IconType = React.ComponentType<{ className?: string }>;
type NavItem = { href: string; key: string; icon: IconType };

const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: "/admin", key: "dashboard", icon: LayoutDashboard },
    { href: "/admin/users", key: "people", icon: Users },
    { href: "/admin/subjects", key: "subjects", icon: BookOpen },
    { href: "/admin/schedule", key: "schedule", icon: CalendarDays },
  ],
  TEACHER: [
    { href: "/teacher", key: "dashboard", icon: LayoutDashboard },
    { href: "/teacher/schedule", key: "schedule", icon: CalendarDays },
    { href: "/teacher/grades", key: "grades", icon: ClipboardList },
  ],
  STUDENT: [
    { href: "/student", key: "dashboard", icon: LayoutDashboard },
    { href: "/student/calendar", key: "calendar", icon: CalendarDays },
    { href: "/student/grades", key: "myGrades", icon: GraduationCap },
  ],
};

export function AppShell({
  role,
  user,
  children,
}: {
  role: Role;
  user: { name: string; phone: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const tNav = useTranslations("nav");
  const tRoles = useTranslations("roles");
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const items = NAV[role];

  function isActive(href: string, index: number) {
    if (index === 0) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo variant="light" />
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          const active = isActive(item.href, i);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-brand-gradient text-white shadow-md shadow-black/20"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-[18px]" />
              {tNav(item.key)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/50">
        © {new Date().getFullYear()} LearnCenter
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 left-0 w-64">{sidebar}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">{sidebar}</div>
        </div>
      ) : null}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex size-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <UserMenu name={user.name} phone={user.phone} roleLabel={tRoles(role)} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
