"use client";

import { Fragment, useMemo, useState } from "react";
import {
  adminChangeRole,
  adminDeleteUser,
  adminTogglePremium,
  adminToggleStatus,
  adminToggleFlag,
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
  isFlagged?: boolean;
  flagReason?: string | null;
  createdAt: string;
  academicInfo: { currentClass: string; institution: string; subjects: string }[];
  studentProfiles: { studentName: string; currentClass: string; institution: string; subjects: string }[];
  tutorProfile?: { tagline: string | null; subjects: string[]; hourlyFee: number; verificationStatus: string } | null;
};

export function UsersTable({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "parent" | "tutor">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "flagged">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => (roleFilter === "all" ? true : u.role === roleFilter))
      .filter((u) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "suspended") return u.status === "suspended";
        if (statusFilter === "flagged") return u.isFlagged === true;
        if (statusFilter === "active") return u.status === "active" && !u.isFlagged;
        return true;
      })
      .filter((u) => (q ? u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) : true))
      .sort((a, b) => (a.name ?? a.email).localeCompare(b.name ?? b.email));
  }, [users, query, roleFilter, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">All Registered Users & Account Safety</h3>
          <p className="text-sm text-slate-500">{filtered.length} users shown</p>
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
            className="input max-w-[130px]"
          >
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="parent">Parents</option>
            <option value="tutor">Tutors</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "suspended" | "flagged")}
            className="input max-w-[140px]"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No users match" hint="Try a different search or filter criteria." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Premium</th>
                <th className="px-4 py-3">Status & Policy</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => {
                const isOpen = expanded === u.id;
                return (
                  <Fragment key={u.id}>
                    <tr className={`hover:bg-slate-50/60 ${u.isFlagged ? "bg-amber-50/20" : ""}`}>
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
                            <span className="block font-medium text-slate-800 flex items-center gap-1.5">
                              {u.name ?? "—"}
                              {u.isFlagged && (
                                <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800" title={u.flagReason || "Flagged"}>
                                  ⚠️ Flagged
                                </span>
                              )}
                            </span>
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
                          <span className="badge bg-amber-50 text-amber-700 font-medium">★ Premium</span>
                        ) : (
                          <span className="text-xs text-slate-400">Free</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          {u.status === "suspended" ? (
                            <span className="badge bg-rose-100 text-rose-700 font-medium">Suspended</span>
                          ) : (
                            <span className="badge bg-emerald-50 text-emerald-700">Active</span>
                          )}
                          {u.isFlagged && u.flagReason && (
                            <span className="text-[11px] text-amber-700 font-medium truncate max-w-[160px]" title={u.flagReason}>
                              Reason: {u.flagReason}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <ActionForm action={adminTogglePremium} id={u.id} title="Toggle premium">
                            <ActionIcon kind="crown" active={u.isPremium} />
                          </ActionForm>
                          <FlagUserForm id={u.id} isFlagged={u.isFlagged} currentReason={u.flagReason} />
                          <ActionForm action={adminToggleStatus} id={u.id} title={u.status === "suspended" ? "Reactivate user" : "Suspend user"}>
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

function FlagUserForm({
  id,
  isFlagged,
  currentReason,
}: {
  id: string;
  isFlagged?: boolean;
  currentReason?: string | null;
}) {
  const [reason, setReason] = useState(currentReason || "");
  const [showPrompt, setShowPrompt] = useState(false);

  if (showPrompt && !isFlagged) {
    return (
      <form
        action={asFormAction(adminToggleFlag)}
        onSubmit={() => setShowPrompt(false)}
        className="flex items-center gap-1"
      >
        <input type="hidden" name="id" value={id} />
        <input
          type="text"
          name="flagReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for flag..."
          className="px-2 py-1 text-xs border border-amber-300 rounded bg-amber-50 focus:outline-none focus:ring-1 focus:ring-amber-500 w-36"
        />
        <button
          type="submit"
          className="px-2 py-1 text-xs font-semibold bg-amber-600 text-white rounded hover:bg-amber-700"
        >
          Flag
        </button>
        <button
          type="button"
          onClick={() => setShowPrompt(false)}
          className="px-1.5 py-1 text-xs text-slate-500 hover:text-slate-700"
        >
          ✕
        </button>
      </form>
    );
  }

  return (
    <form
      action={asFormAction(adminToggleFlag)}
      onSubmit={(e) => {
        if (!isFlagged && !showPrompt) {
          e.preventDefault();
          setShowPrompt(true);
        }
      }}
      title={isFlagged ? "Unflag user" : "Flag user for policy violation"}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={`rounded-md p-1.5 transition ${
          isFlagged ? "text-amber-600 bg-amber-100 hover:bg-amber-200" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        }`}
      >
        <ActionIcon kind="flag" active={isFlagged} />
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

function ActionIcon({ kind, active }: { kind: "crown" | "lock" | "trash" | "swap" | "flag"; active?: boolean }) {
  const cls = "h-4 w-4";
  if (kind === "crown")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M3 7l4 5 5-7 5 7 4-5v10H3z" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "flag")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" strokeLinecap="round" strokeLinejoin="round" />
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

