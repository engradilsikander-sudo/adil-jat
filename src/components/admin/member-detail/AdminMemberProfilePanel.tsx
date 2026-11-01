import { Link } from "@tanstack/react-router";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { BriefcaseBusiness, CreditCard, ImageOff, ShieldCheck, XCircle } from "lucide-react";
import type { useAdminMemberDetailCopy } from "../../../lib/admin-member-detail-i18n";
import { AdminMemberEditPanel } from "./AdminMemberEditForm";
import {
  formatCnic,
  formatDate,
  formatMobile,
  type AdminEditErrors,
  type AdminEditFormState,
  type Member,
} from "../../../lib/admin-member-detail.helpers";

type AdminMemberDetailCopy = ReturnType<typeof useAdminMemberDetailCopy>["copy"];

export function AdminMemberProfilePanel({
  copy,
  member,
  photoUrl,
  editMode,
  editForm,
  editErrors,
  editPhotoPreview,
  selectedPhotoName,
  editSaving,
  canEditApplication,
  canViewCard,
  canIssueOfficeBearer,
  onOpenOfficeBearerPanel,
  onEditChange,
  onPhotoChange,
  onEditSubmit,
  onEditCancel,
}: {
  copy: AdminMemberDetailCopy;
  member: Member;
  photoUrl: string | null;
  editMode: boolean;
  editForm: AdminEditFormState | null;
  editErrors: AdminEditErrors;
  editPhotoPreview: string | null;
  selectedPhotoName: string;
  editSaving: boolean;
  canEditApplication: boolean;
  canViewCard: boolean;
  canIssueOfficeBearer: boolean;
  onOpenOfficeBearerPanel: () => void;
  onEditChange: <K extends keyof AdminEditFormState>(
    field: K,
    value: AdminEditFormState[K],
  ) => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onEditSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditCancel: () => void;
}) {
  return (
    <section className="grid gap-6 md:grid-cols-3">
      <aside className="space-y-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
        <MemberPhoto src={photoUrl} alt={member.full_name} />

        <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {copy.sidebar.quickContact}
          </p>
          <p className="mt-2 break-all text-sm font-black text-slate-950">
            {formatMobile(member.mobile)}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {member.district}
            {member.taluka ? `, ${member.taluka}` : ""}
          </p>
        </div>

        <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-100">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <p className="leading-6">{copy.sidebar.verificationNotice}</p>
          </div>
        </div>
      </aside>

      {editMode && editForm && canEditApplication ? (
        <AdminMemberEditPanel
          form={editForm}
          errors={editErrors}
          photoPreview={editPhotoPreview || photoUrl}
          selectedPhotoName={selectedPhotoName}
          saving={editSaving}
          onChange={onEditChange}
          onPhotoChange={onPhotoChange}
          onSubmit={onEditSubmit}
          onCancel={onEditCancel}
        />
      ) : null}

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6 md:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              {copy.details.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {copy.details.subtitle}
            </p>
          </div>

          {canViewCard ? (
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
              <Link
                to="/admin/members/$id/card"
                params={{ id: member.id }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold !text-white no-underline shadow-sm transition hover:bg-slate-800 hover:!text-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                style={{ color: "#ffffff" }}
              >
                <CreditCard className="h-4 w-4" />
                {copy.openCard}
              </Link>

              {canIssueOfficeBearer ? (
                <button
                  type="button"
                  onClick={onOpenOfficeBearerPanel}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-950 shadow-sm transition hover:bg-amber-100"
                >
                  <BriefcaseBusiness className="h-4 w-4" />
                  Assign Designation
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 space-y-5">
          <DetailGroup title={copy.details.identity}>
            <InfoItem label={copy.details.fullName} value={member.full_name} />
            <InfoItem label={copy.details.fatherName} value={member.father_name} />
            <InfoItem label={copy.cnic} value={formatCnic(member.cnic)} />
            <InfoItem label={copy.details.mobile} value={formatMobile(member.mobile)} />
          </DetailGroup>

          <DetailGroup title={copy.details.location}>
            <InfoItem label={copy.district} value={member.district} />
            <InfoItem label={copy.details.taluka} value={member.taluka} />
            <InfoItem label={copy.details.address} value={member.address} wide />
          </DetailGroup>

          <DetailGroup title={copy.details.profile}>
            <InfoItem label={copy.details.dateOfBirth} value={formatDate(member.date_of_birth)} />
            <InfoItem label={copy.details.gender} value={member.gender} />
            <InfoItem label={copy.details.education} value={member.education} />
            <InfoItem label={copy.details.bloodGroup} value={member.blood_group} />
            <InfoItem label={copy.details.profession} value={member.profession} />
            <InfoItem label={copy.details.casteBranch} value={member.caste_branch} />
          </DetailGroup>

          <DetailGroup title={copy.details.emergencyContact}>
            <InfoItem label={copy.details.emergencyContactName} value={member.emergency_contact_name} />
            <InfoItem label={copy.details.emergencyContactRelation} value={member.emergency_contact_relation} />
            <InfoItem label={copy.details.emergencyContactMobile} value={formatMobile(member.emergency_contact_mobile)} />
            <InfoItem
              label={copy.details.declarationAccepted}
              value={member.declaration_accepted ? copy.details.yes : copy.details.no}
            />
          </DetailGroup>

          <DetailGroup title={copy.details.reviewRecord}>
            <InfoItem label={copy.summary.memberNo} value={member.member_no} />
            <InfoItem label={copy.summary.submitted} value={formatDate(member.created_at, true)} />
            <InfoItem label={copy.details.approvedAt} value={formatDate(member.approved_at, true)} />
            <InfoItem label={copy.details.reviewedAt} value={formatDate(member.reviewed_at, true)} />
          </DetailGroup>
        </div>

        {member.rejection_reason ? (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-100">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">{copy.details.rejectionReason}</p>
                <p className="mt-1 leading-6">{member.rejection_reason}</p>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function MemberPhoto({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
        <ImageOff className="h-10 w-10" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="aspect-[4/5] w-full rounded-2xl bg-slate-100 object-contain ring-1 ring-slate-200"
    />
  );
}

function DetailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-700">
        {title}
      </h3>
      <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function InfoItem({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | number | null | undefined;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value || "N/A"}
      </p>
    </div>
  );
}
