"use client";

import { useEffect, useState } from "react";
import type { StudentProfile } from "@prisma/client";
import {
  createStudentProfile,
  deleteStudentProfile,
  updateStudentProfile,
} from "@/actions/students";
import { searchUsers, linkExistingStudent } from "@/actions/parentStudents";
import { Modal } from "@/components/Modal";
import { ClassSelect } from "@/components/selects";
import { Feedback, SubmitButton, useActionForm, asFormAction } from "@/components/form";
import { EmptyState } from "@/components/ui";

type SearchResult = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
};

export function StudentProfileList({ items }: { items: StudentProfile[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StudentProfile | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (rec: StudentProfile) => {
    setEditing(rec);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">Student profiles</h3>
            <span className={`badge ${items.length >= 5 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
              {items.length}/5
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {items.length >= 5
              ? "You have reached the maximum limit of 5 student profiles per account."
              : "Manage up to 5 students you book tutoring for under this account."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLinkModalOpen(true)}
            className="btn-secondary"
            disabled={items.length >= 5}
            title={items.length >= 5 ? "Maximum limit of 5 students reached" : "Link existing student"}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8.5" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 8v6M23 11h-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Link existing
          </button>
          <button
            onClick={openCreate}
            className="btn-primary"
            disabled={items.length >= 5}
            title={items.length >= 5 ? "Maximum limit of 5 students reached" : "Add student"}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add student
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No student profiles yet"
          hint="Add a student so tutors get accurate context — their class, institution and the subjects they need help with."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((rec) => (
            <div key={rec.id} className="card p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="badge bg-emerald-50 text-emerald-700">{rec.currentClass}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(rec)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Edit"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <form
                    action={asFormAction(deleteStudentProfile)}
                    onClick={(e) => {
                      if (!confirm(`Delete ${rec.studentName}'s profile?`)) e.preventDefault();
                    }}
                  >
                    <input type="hidden" name="id" value={rec.id} />
                    <button
                      type="submit"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Delete"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>
              <p className="font-semibold text-slate-800">{rec.studentName}</p>
              <p className="mt-0.5 text-sm text-slate-600">{rec.institution}</p>
              <p className="mt-1 text-sm text-slate-600">
                <span className="text-slate-400">Needs help with:</span> {rec.subjects}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title={editing ? "Edit student profile" : "Add student profile"} onClose={() => setModalOpen(false)}>
        <StudentForm key={editing?.id ?? "new"} record={editing} onDone={() => setModalOpen(false)} />
      </Modal>

      <Modal open={linkModalOpen} title="Link an existing student" onClose={() => setLinkModalOpen(false)}>
        <LinkStudentForm onDone={() => setLinkModalOpen(false)} />
      </Modal>
    </div>
  );
}

function StudentForm({
  record,
  onDone,
}: {
  record: StudentProfile | null;
  onDone: () => void;
}) {
  const action = record ? updateStudentProfile : createStudentProfile;
  const [state, formAction, pending] = useActionForm(action);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      {record && <input type="hidden" name="id" value={record.id} />}
      <div>
        <label className="label" htmlFor="sp-name">Student name</label>
        <input id="sp-name" name="studentName" className="input" defaultValue={record?.studentName ?? ""} required />
      </div>
      <div>
        <label className="label">Current class / level</label>
        <ClassSelect defaultValue={record?.currentClass} />
      </div>
      <div>
        <label className="label" htmlFor="sp-inst">Institution</label>
        <input id="sp-inst" name="institution" className="input" defaultValue={record?.institution ?? ""} placeholder="School / college" required />
      </div>
      <div>
        <label className="label" htmlFor="sp-sub">Subjects they need help with</label>
        <textarea
          id="sp-sub"
          name="subjects"
          rows={3}
          className="input"
          defaultValue={record?.subjects ?? ""}
          placeholder="e.g. Math, English, Science"
          required
        />
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>{record ? "Update" : "Add student"}</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}

function LinkStudentForm({ onDone }: { onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [state, formAction, pending] = useActionForm(linkExistingStudent);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchUsers(query.trim());
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Search for a registered student by name or email to link them under your account.
        They will receive an in-app notification.
      </p>

      <div>
        <label className="label" htmlFor="link-search">Search by name or email</label>
        <div className="relative">
          <input
            id="link-search"
            type="text"
            className="input pl-9"
            placeholder="Start typing a name or email…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            autoComplete="off"
          />
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {searching && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Searching…
        </div>
      )}

      {!searching && results.length > 0 && !selected && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelected(u)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-white"
            >
              {u.image ? (
                <img src={u.image} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
                  {(u.name || u.email)[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{u.name ?? "Unnamed"}</p>
                <p className="truncate text-xs text-slate-500">{u.email}</p>
              </div>
              <span className="badge bg-slate-100 text-slate-500 capitalize">{u.role}</span>
            </button>
          ))}
        </div>
      )}

      {!searching && query.trim().length >= 2 && results.length === 0 && !selected && (
        <p className="text-sm text-slate-400">No users found matching &quot;{query}&quot;.</p>
      )}

      {selected && (
        <div className="rounded-xl border-2 border-brand-200 bg-brand-50/50 p-4">
          <div className="flex items-center gap-3">
            {selected.image ? (
              <img src={selected.image} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
                {(selected.name || selected.email)[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-800">{selected.name ?? "Unnamed"}</p>
              <p className="text-sm text-slate-500">{selected.email}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600"
              aria-label="Remove selection"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <form action={formAction} className="mt-4">
            <input type="hidden" name="studentUserId" value={selected.id} />
            <div className="flex items-center gap-3">
              <SubmitButton pending={pending}>Link this student</SubmitButton>
              <Feedback state={state} />
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
