import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Hourglass,
  Loader2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useAdminMemberDetailCopy } from "../../../lib/admin-member-detail-i18n";
import {
  getStatusLabel,
  type Member,
  type MemberStatus,
} from "../../../lib/admin-member-detail.helpers";

type AdminMemberDetailCopy = ReturnType<typeof useAdminMemberDetailCopy>["copy"];

export function StatusPanel({ member }: { member: Member }) {
  const { copy } = useAdminMemberDetailCopy();

  const config: Record<
    MemberStatus,
    {
      title: string;
      text: string;
      className: string;
      icon: ReactNode;
    }
  > = {
    pending: {
      title: copy.status.pendingTitle,
      text: copy.status.pendingText,
      className: "bg-amber-50 text-amber-900 ring-amber-100",
      icon: <Hourglass className="h-5 w-5 text-amber-700" />,
    },
    approved: {
      title: copy.status.approvedTitle,
      text: member.member_no
        ? copy.status.approvedTextIssued.replace(
            "{{memberNo}}",
            member.member_no,
          )
        : copy.status.approvedTextMissing,
      className: "bg-emerald-50 text-emerald-900 ring-emerald-100",
      icon: <BadgeCheck className="h-5 w-5 text-emerald-700" />,
    },
    rejected: {
      title: copy.status.rejectedTitle,
      text: member.rejection_reason || copy.status.rejectedText,
      className: "bg-red-50 text-red-900 ring-red-100",
      icon: <XCircle className="h-5 w-5 text-red-700" />,
    },
  };

  const item = config[member.status];

  return (
    <section className={`rounded-3xl p-5 ring-1 ${item.className}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white/70 p-3 shadow-sm">{item.icon}</div>
        <div>
          <h2 className="text-base font-black">{item.title}</h2>
          <p className="mt-1 text-sm leading-6">{item.text}</p>
        </div>
      </div>
    </section>
  );
}

export function AdminMemberReviewPanel({
  member,
  copy,
  canViewCard,
  actionLoading,
  rejectionReason,
  trimmedRejectionReason,
  reasonTooShort,
  minRejectionReasonLength,
  onApprove,
  onReject,
  onRejectionReasonChange,
}: {
  member: Member;
  copy: AdminMemberDetailCopy;
  canViewCard: boolean;
  actionLoading: boolean;
  rejectionReason: string;
  trimmedRejectionReason: string;
  reasonTooShort: boolean;
  minRejectionReasonLength: number;
  onApprove: () => void;
  onReject: () => void;
  onRejectionReasonChange: (value: string) => void;
}) {
  if (member.status !== "pending") {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              {copy.review.completedTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {copy.review.completedText} <strong>{getStatusLabel(member.status, copy)}</strong>.
            </p>
          </div>

          {canViewCard ? (
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
              <Link
                to="/admin/members/$id/card"
                params={{ id: member.id }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold !text-white no-underline shadow-sm transition hover:bg-slate-800 hover:!text-white"
                style={{ color: "#ffffff" }}
              >
                <CreditCard className="h-4 w-4" />
                {copy.viewCard}
              </Link>
            </div>
          ) : (
            <Link
              to="/admin"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-slate-800 no-underline shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.review.backToAdminList}
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="admin-member-review-panel rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950">
            {copy.review.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            {copy.review.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onApprove}
          disabled={actionLoading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actionLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserCheck className="h-4 w-4" />
          )}
          {actionLoading ? copy.review.processing : copy.review.approve}
        </button>
      </div>

      <ReviewChecklist member={member} />

      <div className="admin-member-rejection-box mt-6 max-w-2xl rounded-2xl border border-red-100 bg-red-50/60 p-4">
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-red-900">
            {copy.details.rejectionReason}
          </span>

          <textarea
            value={rejectionReason}
            onChange={(event) => onRejectionReasonChange(event.target.value)}
            className="min-h-28 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 sm:text-sm"
            placeholder={copy.review.rejectionPlaceholder}
          />
        </label>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={`text-xs font-medium ${
              reasonTooShort ? "text-red-700" : "text-slate-500"
            }`}
          >
            {copy.review.minimum} {minRejectionReasonLength} {copy.review.charactersRequired}
            {copy.review.current}: {trimmedRejectionReason.length}
          </p>

          <button
            type="button"
            onClick={onReject}
            disabled={
              actionLoading ||
              trimmedRejectionReason.length < minRejectionReasonLength
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {actionLoading ? copy.review.processing : copy.review.reject}
          </button>
        </div>
      </div>
    </section>
  );
}

function ReviewChecklist({ member }: { member: Member }) {
  const checks = [
    {
      label: "Photo",
      ready: Boolean(member.photo_url),
      text: member.photo_url ? "Photo uploaded." : "Photo is missing.",
    },
    {
      label: "CNIC & mobile",
      ready: Boolean(member.cnic && member.mobile),
      text: "CNIC and mobile number should be verified before approval.",
    },
    {
      label: "Area",
      ready: Boolean(member.district && member.taluka),
      text: member.taluka
        ? `${member.district} / ${member.taluka}`
        : "Taluka is missing or not selected.",
    },
    {
      label: "Declaration",
      ready: member.declaration_accepted,
      text: member.declaration_accepted
        ? "Member accepted declaration."
        : "Declaration is not accepted.",
    },
  ];

  return (
    <div className="admin-member-checklist mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-black text-emerald-950">
            Approval verification checklist
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-900/75">
            Review profile details, photo and identity information
            before approval.
          </p>
        </div>

        <div className="rounded-2xl bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-800 shadow-sm ring-1 ring-emerald-100">
          Manual Review
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-emerald-100"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                  check.ready
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {check.ready ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
              </span>

              <div className="min-w-0">
                <p className="text-sm font-black text-slate-950">
                  {check.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {check.text}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-member-payment-note mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Membership is free. No payment or receipt is required for approval.
          </p>
        </div>
      </div>
    </div>
  );
}
