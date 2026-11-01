import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { CheckCircle2, ImageOff, Loader2 } from "lucide-react";
import { formatCnicInput, formatMobileInput, todayDate } from "../../../lib/shared/formatters";
import type { AdminEditErrors, AdminEditFormState } from "../../../lib/admin-member-detail.helpers";

export function AdminMemberEditPanel({
  form,
  errors,
  photoPreview,
  selectedPhotoName,
  saving,
  onChange,
  onPhotoChange,
  onSubmit,
  onCancel,
}: {
  form: AdminEditFormState;
  errors: AdminEditErrors;
  photoPreview: string | null;
  selectedPhotoName: string;
  saving: boolean;
  onChange: <K extends keyof AdminEditFormState>(
    field: K,
    value: AdminEditFormState[K],
  ) => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <section
      id="admin-member-edit-panel"
      className="scroll-mt-24 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-amber-200 sm:p-6 md:col-span-2"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
            Admin Edit Mode
          </p>
          <h2 className="mt-2 text-lg font-black text-slate-950">
            Edit member application
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Update member details when a correction is needed. Member number,
            review status and approval fields remain controlled by the existing
            review workflow.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-6" noValidate>
        <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Profile preview"
                className="aspect-[4/5] w-full object-contain bg-slate-50"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center text-slate-400">
                <ImageOff className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                Replace profile photo
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onPhotoChange}
                className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              PNG, JPG or WebP only. Maximum 2MB.{" "}
              {selectedPhotoName ? `Selected: ${selectedPhotoName}` : ""}
            </p>
            {errors.photo ? (
              <p className="mt-2 text-xs font-bold text-red-700">
                {errors.photo}
              </p>
            ) : null}
          </div>
        </div>

        <AdminEditGroup title="Identity">
          <AdminEditInput label="Full name" error={errors.fullName} required>
            <input
              value={form.fullName}
              onChange={(event) => onChange("fullName", event.target.value)}
              className="admin-edit-input"
              aria-invalid={Boolean(errors.fullName)}
            />
          </AdminEditInput>
          <AdminEditInput
            label="Father name"
            error={errors.fatherName}
            required
          >
            <input
              value={form.fatherName}
              onChange={(event) => onChange("fatherName", event.target.value)}
              className="admin-edit-input"
              aria-invalid={Boolean(errors.fatherName)}
            />
          </AdminEditInput>
          <AdminEditInput label="CNIC" error={errors.cnic} required>
            <input
              value={form.cnic}
              onChange={(event) =>
                onChange("cnic", formatCnicInput(event.target.value))
              }
              className="admin-edit-input"
              inputMode="numeric"
              aria-invalid={Boolean(errors.cnic)}
            />
          </AdminEditInput>
          <AdminEditInput label="Mobile" error={errors.mobile} required>
            <input
              value={form.mobile}
              onChange={(event) =>
                onChange("mobile", formatMobileInput(event.target.value))
              }
              className="admin-edit-input"
              inputMode="tel"
              aria-invalid={Boolean(errors.mobile)}
            />
          </AdminEditInput>
        </AdminEditGroup>

        <AdminEditGroup title="Location">
          <AdminEditInput label="District" error={errors.district} required>
            <input
              value={form.district}
              onChange={(event) => onChange("district", event.target.value)}
              className="admin-edit-input"
              aria-invalid={Boolean(errors.district)}
            />
          </AdminEditInput>
          <AdminEditInput label="Taluka" error={errors.taluka} required>
            <input
              value={form.taluka}
              onChange={(event) => onChange("taluka", event.target.value)}
              className="admin-edit-input"
              aria-invalid={Boolean(errors.taluka)}
            />
          </AdminEditInput>
          <AdminEditInput label="Address" error={errors.address} required wide>
            <textarea
              value={form.address}
              onChange={(event) => onChange("address", event.target.value)}
              className="admin-edit-input min-h-24"
              aria-invalid={Boolean(errors.address)}
            />
          </AdminEditInput>
        </AdminEditGroup>

        <AdminEditGroup title="Profile">
          <AdminEditInput label="Date of birth" error={errors.dateOfBirth}>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => onChange("dateOfBirth", event.target.value)}
              className="admin-edit-input"
              max={todayDate()}
              aria-invalid={Boolean(errors.dateOfBirth)}
            />
          </AdminEditInput>
          <AdminEditInput label="Gender">
            <input
              value={form.gender}
              onChange={(event) => onChange("gender", event.target.value)}
              className="admin-edit-input"
            />
          </AdminEditInput>
          <AdminEditInput label="Education">
            <input
              value={form.education}
              onChange={(event) => onChange("education", event.target.value)}
              className="admin-edit-input"
            />
          </AdminEditInput>
          <AdminEditInput label="Blood group">
            <input
              value={form.bloodGroup}
              onChange={(event) => onChange("bloodGroup", event.target.value)}
              className="admin-edit-input"
            />
          </AdminEditInput>
          <AdminEditInput label="Profession">
            <input
              value={form.profession}
              onChange={(event) => onChange("profession", event.target.value)}
              className="admin-edit-input"
            />
          </AdminEditInput>
          <AdminEditInput label="Caste / branch">
            <input
              value={form.casteBranch}
              onChange={(event) => onChange("casteBranch", event.target.value)}
              className="admin-edit-input"
            />
          </AdminEditInput>
        </AdminEditGroup>

        <AdminEditGroup title="Emergency contact">
          <AdminEditInput label="Contact name">
            <input
              value={form.emergencyContactName}
              onChange={(event) =>
                onChange("emergencyContactName", event.target.value)
              }
              className="admin-edit-input"
            />
          </AdminEditInput>
          <AdminEditInput label="Relation">
            <input
              value={form.emergencyContactRelation}
              onChange={(event) =>
                onChange("emergencyContactRelation", event.target.value)
              }
              className="admin-edit-input"
            />
          </AdminEditInput>
          <AdminEditInput
            label="Contact mobile"
            error={errors.emergencyContactMobile}
          >
            <input
              value={form.emergencyContactMobile}
              onChange={(event) =>
                onChange(
                  "emergencyContactMobile",
                  formatMobileInput(event.target.value),
                )
              }
              className="admin-edit-input"
              inputMode="tel"
              aria-invalid={Boolean(errors.emergencyContactMobile)}
            />
          </AdminEditInput>
        </AdminEditGroup>

        <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-800">
          <input
            type="checkbox"
            checked={form.declarationAccepted}
            onChange={(event) =>
              onChange("declarationAccepted", event.target.checked)
            }
            className="mt-1 h-4 w-4 accent-emerald-700"
          />
          Declaration accepted by the member / verified by admin.
        </label>
        {errors.declarationAccepted ? (
          <p className="text-xs font-bold text-red-700">
            {errors.declarationAccepted}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Application"}
          </button>
        </div>
      </form>
    </section>
  );
}

function AdminEditGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">
        {title}
      </h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function AdminEditInput({
  label,
  children,
  error,
  required,
  wide,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "md:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-bold text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}
