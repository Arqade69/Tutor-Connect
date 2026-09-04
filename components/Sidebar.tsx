"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import {
  DashboardIcon,
  UserIcon,
  BookIcon,
  UsersIcon,
  SearchIcon,
  CalendarIcon,
  SparklesIcon,
  ChartIcon,
  MenuIcon,
  CloseIcon,
  ChatIcon,
  RobotIcon,
  SettingsIcon,
  ShieldIcon,
  CrownIcon,
  GiftIcon,
} from "@/components/icons";

const ICONS = {
  dashboard: DashboardIcon,
  user: UserIcon,
  book: BookIcon,
  users: UsersIcon,
  search: SearchIcon,
  calendar: CalendarIcon,
  sparkles: SparklesIcon,
  chart: ChartIcon,
  chat: ChatIcon,
  robot: RobotIcon,
  settings: SettingsIcon,
  shield: ShieldIcon,
  crown: CrownIcon,
  gift: GiftIcon,
} as const;

export type IconName = keyof typeof ICONS;

export type NavItem = {
  label: string;
  href?: string;
  icon?: IconName;
  soon?: boolean;
};

export type NavGroup = { heading?: string; items: NavItem[] };

const roleBadge: Record<string, string> = {
  student: "bg-brand-400/20 text-brand-200",
  parent: "bg-emerald-400/20 text-emerald-200",
  admin: "bg-amber-400/20 text-amber-200",
  tutor: "bg-purple-400/20 text-purple-200",
};

function Avatar({
  image,
  fallback,
  size,
}: {
  image?: string | null;
  fallback: string;
  size: number;
}) {
  const [imgError, setImgError] = useState(false);

  if (image && !imgError) {
    return (
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-500 font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {fallback[0]?.toUpperCase()}
    </span>
  );
}

export function Sidebar({
  role,
  name,
  email,
  image,
  homeHref,
  groups,
}: {
  role: string;
  name?: string | null;
  email: string;
  image?: string | null;
  homeHref: string;
  groups: NavGroup[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const fallback = name ?? email;

  const isActive = (href?: string) => {
    if (!href || href.includes("#")) return false;
    const [path, query] = href.split("?");
    if (pathname !== path) return false;

    const currentTab = searchParams ? searchParams.get("tab") || "overview" : "overview";
    if (query) {
      const itemParams = new URLSearchParams(query);
      const itemTab = itemParams.get("tab");
      return itemTab === currentTab;
    }

    if (path === "/dashboard/admin") {
      return currentTab === "overview";
    }

    return true;
  };

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="-ml-1 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
          aria-label="Open navigation"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
        <Link
          href={homeHref}
          className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-900"
        >
          <Logo className="h-7 w-7" />
          Tutor<span className="text-brand-600">-Connect</span>
        </Link>
        <Avatar image={image} fallback={fallback} size={32} />
      </header>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 transform flex-col bg-gradient-to-b from-brand-800 to-brand-900 transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:self-start lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <Link
            href={homeHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5"
          >
            <Logo className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight text-white">
              Tutor<span className="text-brand-300">-Connect</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-brand-200 transition hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-3">
          {groups.map((group, gi) => (
            <div key={gi} className="space-y-1">
              {group.heading && (
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-brand-300/60">
                  {group.heading}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon ? ICONS[item.icon] : null;
                if (item.soon || !item.href) {
                  return (
                    <span
                      key={item.label}
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-100/40"
                    >
                      {Icon && <Icon className="h-5 w-5 shrink-0 text-brand-200/40" />}
                      <span className="flex-1">{item.label}</span>
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-200/60">
                        Soon
                      </span>
                    </span>
                  );
                }
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-white/10 text-white ring-1 ring-inset ring-white/10"
                        : "text-brand-100/80 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {Icon && (
                      <Icon
                        className={`h-5 w-5 shrink-0 ${
                          active ? "text-white" : "text-brand-300"
                        }`}
                      />
                    )}
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User profile + sign out */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <Avatar image={image} fallback={fallback} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">
                  {name ?? "User"}
                </p>
                <span
                  className={`badge ${roleBadge[role] ?? roleBadge.student}`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </span>
              </div>
              <p className="truncate text-xs text-brand-200/70">{email}</p>
            </div>
          </div>
          <div className="mt-2">
            <SignOutButton tone="dark" />
          </div>
        </div>
      </aside>
    </>
  );
}
