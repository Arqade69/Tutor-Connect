"use client";

import { Fragment, useMemo, useState } from "react";
import {
  adminChangeRole,
  adminDeleteUser,
  adminTogglePremium,
  adminToggleStatus,
} from "@/actions/admin";
import { EmptyState } from "@/components/ui";
import { asFormAction } from "@/components/form";

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone: string | null;
  location: string | null;
  district: string | null;
  isPremium: boolean;
  status: string;
  createdAt: string;
  academicInfo: { currentClass: string; institution: string; subjects: string }[];
  studentProfiles: { studentName: string; currentClass: string; institution: string; subjects: string }[];
  tutorProfile?: { tagline: string | null; subjects: string[]; hourlyFee: number; verificationStatus: string } | null;
};

export function UsersTable({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "parent" | "tutor">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => (roleFilter === "all" ? true : u.role === roleFilter))
      .filter((u) => (q ? u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) : true))
      .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
  }, [users, query, roleFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">All users</h3>
          <p className="text-sm text-slate-500">{filtered.length} shown</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="input max-w-xs"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "all" | "student" | "parent" | "tutor")}
            className="input max-w-[140px]"
          >
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="parent">Parents</option>
            <option value="tutor">Tutors</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No users match" hint="Try a different search or filter." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Premium</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => {
                const isOpen = expanded === u.id;
                return (
                  <Fragment key={u.id}>
                    <tr className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : u.id)}
                          className="flex items-center gap-2 text-left"
                        >
                          <span
                            className={`text-slate-400 transition ${isOpen ? "rotate-90" : ""}`}
                            aria-hidden="true"
                          >
                            ▸
                          </span>
                          <span>
                            <span className="block font-medium text-slate-800">{u.name ?? "—"}</span>
                            <span className="block text-xs text-slate-500">{u.email}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${
                            u.role === "student"
                              ? "bg-brand-50 text-brand-700"
                              : u.role === "parent"
                                ? "bg-emerald-50 text-emerald-700"
                                : u.role === "tutor"
                                  ? "bg-purple-50 text-purple-700"
                                  : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.isPremium ? (
                          <span className="badge bg-amber-50 text-amber-700">Premium</span>
                        ) : (
                          <span className="text-xs text-slate-400">Free</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.status === "suspended" ? (
                          <span className="badge bg-rose-50 text-rose-700">Suspended</span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-600">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <ActionForm action={adminTogglePremium} id={u.id} title="Toggle premium">
                            <ActionIcon kind="crown" active={u.isPremium} />
                          </ActionForm>
                          <ActionForm action={adminToggleStatus} id={u.id} title="Suspend / activate">
                            <ActionIcon kind="lock" active={u.status === "suspended"} />
                          </ActionForm>
                          <RoleSwitchForm id={u.id} current={u.role} />
                          <ActionForm
                            action={adminDeleteUser}
                            id={u.id}
                            confirm={`Permanently delete ${u.name ?? u.email}?`}
                            title="Delete"
                          >
                            <ActionIcon kind="trash" />
                          </ActionForm>
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50/40">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contact</p>
                              <p className="text-slate-700">Phone: {u.phone ?? "—"}</p>
                              <p className="text-slate-700">Location: {[u.location, u.district].filter(Boolean).join(", ") || "—"}</p>
                              <p className="text-slate-700">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {u.role === "parent" ? "Student profiles" : "Academic details"}
                              </p>
                              {u.role === "parent" ? (
                                u.studentProfiles.length ? (
                                  u.studentProfiles.map((s, i) => (
                                    <p key={i} className="text-slate-700">
                                      <span className="font-medium">{s.studentName}</span> — {s.currentClass}, {s.institution} ({s.subjects})
                                    </p>
                                  ))
                                ) : (
                                  <p className="text-slate-400">None</p>
                                )
                              ) : u.academicInfo.length ? (
                                u.academicInfo.map((a, i) => (
                                  <p key={i} className="text-slate-700">
                                    {a.currentClass}, {a.institution} ({a.subjects})
                                  </p>
                                ))
                              ) : (
                                <p className="text-slate-400">None</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActionForm({
  action,
  id,
  children,
  confirm,
  title,
}: {
  action: (fd: FormData) => Promise<unknown>;
  id: string;
  children: React.ReactNode;
  confirm?: string;
  title?: string;
}) {
  return (
    <form
      action={asFormAction(action)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      title={title}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:hover:bg-transparent">
        {children}
      </button>
    </form>
  );
}

function RoleSwitchForm({ id, current }: { id: string; current: string }) {
  const next = current === "student" ? "parent" : "student";
  return (
    <form action={asFormAction(adminChangeRole)} title={`Make ${next}`}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="role" value={next} />
      <button type="submit" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <ActionIcon kind="swap" />
      </button>
    </form>
  );
}

function ActionIcon({ kind, active }: { kind: "crown" | "lock" | "trash" | "swap"; active?: boolean }) {
  const cls = "h-4 w-4";
  if (kind === "crown")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M3 7l4 5 5-7 5 7 4-5v10H3z" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "lock")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </svg>
    );
  if (kind === "swap")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 7h13M16 3l4 4-4 4M17 17H4m5-4l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
