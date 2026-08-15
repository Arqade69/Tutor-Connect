"use client";

import { useEffect, useState } from "react";
import type { AcademicInfo } from "@prisma/client";
import {
  createAcademicInfo,
  deleteAcademicInfo,
  updateAcademicInfo,
} from "@/actions/academic";
import { Modal } from "@/components/Modal";
import { ClassSelect } from "@/components/selects";
import { Feedback, SubmitButton, useActionForm, asFormAction } from "@/components/form";
import { EmptyState } from "@/components/ui";

export function AcademicInfoList({ items }: { items: AcademicInfo[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicInfo | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (rec: AcademicInfo) => {
    setEditing(rec);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Academic details</h3>
          <p className="text-sm text-slate-500">Add the class, institution and subjects you need help with.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No academic details yet"
          hint="Add your current class, institution and the subjects you want tutoring in so tutors get the right context."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((rec) => (
            <div key={rec.id} className="card p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="badge bg-brand-50 text-brand-700">{rec.currentClass}</span>
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
                    action={asFormAction(deleteAcademicInfo)}
                    onClick={(e) => {
                      if (!confirm("Delete this academic record?")) e.preventDefault();
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
              <p className="font-medium text-slate-800">{rec.institution}</p>
              <p className="mt-1 text-sm text-slate-600">
                <span className="text-slate-400">Subjects:</span> {rec.subjects}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title={editing ? "Edit academic detail" : "Add academic detail"} onClose={() => setModalOpen(false)}>
        <AcademicForm
          key={editing?.id ?? "new"}
          record={editing}
          onDone={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

function AcademicForm({
  record,
  onDone,
}: {
  record: AcademicInfo | null;
  onDone: () => void;
}) {
  const action = record ? updateAcademicInfo : createAcademicInfo;
  const [state, formAction, pending] = useActionForm(action);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      {record && <input type="hidden" name="id" value={record.id} />}
      <div>
        <label className="label">Current class / level</label>
        <ClassSelect defaultValue={record?.currentClass} />
      </div>
      <div>
        <label className="label" htmlFor="ai-inst">Institution</label>
        <input id="ai-inst" name="institution" className="input" defaultValue={record?.institution ?? ""} placeholder="School / college" required />
      </div>
      <div>
        <label className="label" htmlFor="ai-sub">Subjects you need help with</label>
        <textarea
          id="ai-sub"
          name="subjects"
          rows={3}
          className="input"
          defaultValue={record?.subjects ?? ""}
          placeholder="e.g. Physics, Chemistry, Higher Math"
          required
        />
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending}>{record ? "Update" : "Add detail"}</SubmitButton>
        <Feedback state={state} />
      </div>
    </form>
  );
}
