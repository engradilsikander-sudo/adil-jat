import { Link } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { BadgeCheck, BriefcaseBusiness, Loader2, RefreshCw } from "lucide-react";
import {
  formatCommitteeDate,
  getCommitteeLocationLabel,
  getCommitteeStatusClass,
  getCommitteeStatusLabel,
  getCommitteeTypeLabel,
  type CommitteeRecord,
  type CommitteeStatus,
  type DesignationRecord,
} from "../../../lib/committees";
import { AdminEditInput } from "./AdminMemberEditForm";
import {
  designationAssignmentLevelOptions,
  findCommitteeForDesignationLevel,
  getDesignationDropdownOptions,
  getSelectedDesignationLevel,
  recommendedDesignationsByLevel,
  type AdminOfficeBearerAssignment,
  type DesignationAssignmentLevel,
  type Member,
  type OfficeBearerIssueForm,
} from "../../../lib/admin-member-detail.helpers";

export function OfficeBearerIssuePanel({
  member,
  assignments,
  committees,
  designations,
  selectedCommittee,
  form,
  loading,
  saving,
  error,
  isOpen,
  hasActiveOfficeBearer,
  onOpenChange,
  onRefresh,
  onCommitteeChange,
  onDesignationChange,
  onFormChange,
  onSubmit,
}: {
  member: Member;
  assignments: AdminOfficeBearerAssignment[];
  committees: CommitteeRecord[];
  designations: DesignationRecord[];
  selectedCommittee: CommitteeRecord | null;
  form: OfficeBearerIssueForm;
  loading: boolean;
  saving: boolean;
  error: string;
  isOpen: boolean;
  hasActiveOfficeBearer: boolean;
  onOpenChange: (value: boolean) => void;
  onRefresh: () => void;
  onCommitteeChange: (committeeId: string) => void;
  onDesignationChange: (designationId: string) => void;
  onFormChange: (fields: Partial<OfficeBearerIssueForm>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const activeCommittees = committees.filter(
    (committee) => committee.status === "active",
  );
  const selectedActiveCommittee =
    selectedCommittee?.status === "active" ? selectedCommittee : null;
  const selectedLevel = getSelectedDesignationLevel(
    selectedActiveCommittee,
    activeCommittees,
    member,
  );
  const designationDropdownOptions = getDesignationDropdownOptions(
    selectedLevel,
    designations,
  );
  const selectedDesignationValue =
    designationDropdownOptions.find(
      (option) =>
        (option.designationId && option.designationId === form.designationId) ||
        option.label === form.designationTitle,
    )?.value ?? "";
  const canSubmit =
    Boolean(selectedActiveCommittee) && Boolean(form.designationTitle.trim());

  return (
    <section
      id="office-bearer-issue-panel"
      className="scroll-mt-24 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            Member Designation
          </p>
          <h2 className="mt-2 text-lg font-black text-slate-950">
            Assign designation to membership card
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Select a level for this approved member. After saving, the
            designation will appear on the standard JAS membership card and
            membership QR verification page.
          </p>
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <Link
            to="/admin/members/$id/card"
            params={{ id: member.id }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-950 px-4 text-sm font-bold !text-white no-underline shadow-sm ring-1 ring-amber-300/40 transition hover:bg-emerald-900 hover:!text-white"
            style={{ color: "#ffffff" }}
          >
            <BadgeCheck className="h-4 w-4 text-amber-300" />
            Open Membership Card
          </Link>

          <button
            type="button"
            onClick={() => onOpenChange(!isOpen)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-950 shadow-sm transition hover:bg-amber-100"
          >
            <BriefcaseBusiness className="h-4 w-4" />
            {isOpen ? "Close Form" : "Assign Designation"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
                Current member designations
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Active designation will be printed on the standard membership
                card.
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
                hasActiveOfficeBearer
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                  : "bg-amber-50 text-amber-900 ring-amber-200"
              }`}
            >
              {hasActiveOfficeBearer
                ? "Active Designation"
                : "No Active Designation"}
            </span>
          </div>

          {loading ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-white p-4 text-sm font-bold text-slate-600 ring-1 ring-slate-200">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
              Loading designation assignments...
            </div>
          ) : assignments.length ? (
            <div className="mt-4 grid gap-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-base font-black text-slate-950">
                        {assignment.designation_title}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        {assignment.committee?.name ?? "Committee not found"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {assignment.committee
                          ? `${getCommitteeTypeLabel(assignment.committee.committee_type)} · ${getCommitteeLocationLabel(assignment.committee)}`
                          : "Committee details unavailable"}
                      </p>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${getCommitteeStatusClass(
                        assignment.status,
                      )}`}
                    >
                      {getCommitteeStatusLabel(assignment.status)}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2">
                    <span>
                      Start: {formatCommitteeDate(assignment.tenure_start)}
                    </span>
                    <span>
                      End: {formatCommitteeDate(assignment.tenure_end)}
                    </span>
                    <span>Order: {assignment.sort_order}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {assignment.committee ? (
                      <Link
                        to="/admin/committees/$id"
                        params={{ id: assignment.committee.id }}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 no-underline shadow-sm transition hover:bg-slate-50"
                      >
                        Manage Committee
                      </Link>
                    ) : null}
                    {assignment.status === "active" ? (
                      <Link
                        to="/admin/members/$id/card"
                        params={{ id: member.id }}
                        className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-900 px-3 text-xs font-black !text-white no-underline shadow-sm transition hover:bg-emerald-800"
                        style={{ color: "#ffffff" }}
                      >
                        Open Membership Card
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-white p-4 text-sm font-semibold leading-6 text-slate-600 ring-1 ring-slate-200">
              No designation has been assigned to this approved member yet. Use
              the quick form to assign one.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <p className="font-black">Designation assignment process</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 font-semibold">
            <li>Select a level.</li>
            <li>Select or type the designation title.</li>
            <li>
              Save to show the designation on the standard membership card.
            </li>
          </ol>
          <p className="mt-3 text-xs font-semibold text-amber-800">
            Member must remain approved and the assigned level/designation must
            stay active for QR verification to remain valid.
          </p>
        </div>
      </div>

      {isOpen ? (
        <form
          onSubmit={onSubmit}
          className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4"
          noValidate
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AdminEditInput label="Level" required>
              <select
                value={selectedLevel}
                onChange={(event) => {
                  const committee = findCommitteeForDesignationLevel(
                    event.target.value as DesignationAssignmentLevel,
                    activeCommittees,
                    member,
                  );

                  onCommitteeChange(committee?.id ?? "");
                }}
                className="admin-edit-input"
              >
                <option value="">Select level</option>
                {designationAssignmentLevelOptions.map((level) => {
                  const committee = findCommitteeForDesignationLevel(
                    level.value,
                    activeCommittees,
                    member,
                  );

                  return (
                    <option
                      key={level.value}
                      value={level.value}
                      disabled={!committee}
                    >
                      {level.label}
                      {committee ? "" : " — not configured"}
                    </option>
                  );
                })}
              </select>
            </AdminEditInput>

            <AdminEditInput label="Designation" required>
              <select
                value={selectedDesignationValue}
                onChange={(event) => {
                  const option = designationDropdownOptions.find(
                    (item) => item.value === event.target.value,
                  );

                  if (!option) {
                    onFormChange({ designationId: "", designationTitle: "" });
                    return;
                  }

                  if (option.designationId) {
                    onDesignationChange(option.designationId);
                    return;
                  }

                  onFormChange({
                    designationId: "",
                    designationTitle: option.label,
                  });
                }}
                className="admin-edit-input"
                disabled={!selectedActiveCommittee}
              >
                <option value="">Select designation</option>
                {designationDropdownOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {option.source === "configured" ? " — configured" : ""}
                  </option>
                ))}
              </select>
            </AdminEditInput>

            <AdminEditInput label="Final card title" required>
              <input
                value={form.designationTitle}
                onChange={(event) =>
                  onFormChange({ designationTitle: event.target.value })
                }
                className="admin-edit-input"
                placeholder={
                  selectedLevel
                    ? `e.g. ${recommendedDesignationsByLevel[selectedLevel][0]}`
                    : "Select level first"
                }
              />
            </AdminEditInput>

            <AdminEditInput label="Status" required>
              <select
                value={form.status}
                onChange={(event) =>
                  onFormChange({
                    status: event.target.value as CommitteeStatus,
                  })
                }
                className="admin-edit-input"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="completed">Completed</option>
                <option value="resigned">Resigned</option>
              </select>
            </AdminEditInput>

            <AdminEditInput label="Display order" required>
              <input
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(event) =>
                  onFormChange({ sortOrder: event.target.value })
                }
                className="admin-edit-input"
              />
            </AdminEditInput>

            <AdminEditInput label="Tenure start">
              <input
                type="date"
                value={form.tenureStart}
                onChange={(event) =>
                  onFormChange({ tenureStart: event.target.value })
                }
                className="admin-edit-input"
              />
            </AdminEditInput>

            <AdminEditInput label="Tenure end">
              <input
                type="date"
                value={form.tenureEnd}
                onChange={(event) =>
                  onFormChange({ tenureEnd: event.target.value })
                }
                className="admin-edit-input"
              />
            </AdminEditInput>

            <AdminEditInput label="Appointment notes" wide>
              <textarea
                value={form.appointmentNotes}
                onChange={(event) =>
                  onFormChange({ appointmentNotes: event.target.value })
                }
                className="admin-edit-input min-h-24"
                placeholder="Optional CWC/committee approval note."
              />
            </AdminEditInput>
          </div>

          {activeCommittees.length === 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">
              No active level is available. Create or activate the required
              level first from Committees & Designations.
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !canSubmit || activeCommittees.length === 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BadgeCheck className="h-4 w-4" />
              )}
              {saving ? "Assigning..." : "Assign Designation"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
