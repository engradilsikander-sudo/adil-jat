import { FreeMembershipNotice } from '../../../components/FreeMembershipNotice';
// src/routes/admin/members/$id.tsx
import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { AdminShell } from "../../../components/admin/AdminShell";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Hourglass,
  IdCard,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  approveMemberAction,
  rejectMemberAction,
  updateMemberApplicationAction,
} from "../../../lib/admin/actions";
import { supabase } from "../../../lib/supabase/client";
import {
  normalizeMobile,
  optionalText,
  todayDate,
} from "../../../lib/shared/formatters";
import { useAdminMemberDetailCopy } from "../../../lib/admin-member-detail-i18n";
import {
  addCommitteeMember,
  currentUserCanManageCommittees,
  fetchCommitteesForAdmin,
  fetchDesignations,
  type CommitteeRecord,
  type DesignationRecord,
} from "../../../lib/committees";
import { AdminMemberProfilePanel } from "../../../components/admin/member-detail/AdminMemberProfilePanel";
import { AdminMemberReviewPanel, StatusPanel } from "../../../components/admin/member-detail/AdminMemberReviewPanel";
import { OfficeBearerIssuePanel } from "../../../components/admin/member-detail/OfficeBearerIssuePanel";
import {
  MEMBER_PHOTO_ALLOWED_TYPES,
  MEMBER_PHOTO_BUCKET,
  MEMBER_PHOTO_MAX_SIZE_BYTES,
  MIN_REJECTION_REASON_LENGTH,
  createSignedPhotoUrl,
  ensureAdminAccess,
  fetchMemberById,
  fetchOfficeBearerAssignments,
  formatCnic,
  formatDate,
  getAccessToken,
  getStatusLabel,
  initialOfficeBearerIssueForm,
  memberToAdminEditForm,
  memberToCommitteeSearchResult,
  validateAdminEditForm,
  type AdminEditErrors,
  type AdminEditFormState,
  type AdminOfficeBearerAssignment,
  type Member,
  type MemberStatus,
  type OfficeBearerIssueForm,
} from "../../../lib/admin-member-detail.helpers";

export const Route = createFileRoute("/admin/members/$id")({
  component: AdminMemberDetailPage,
});

function AdminMemberDetailPage() {
  const { id } = Route.useParams();

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const normalizedPathname = pathname.replace(/\/+$/, "");
  const isNestedMemberRoute =
    normalizedPathname === `/admin/members/${id}/card` ||
    normalizedPathname === `/admin/members/${id}/designation-card`;

  if (isNestedMemberRoute) {
    return <Outlet />;
  }

  return <AdminMemberApplicationPage id={id} />;
}

function AdminMemberApplicationPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const { copy, textDir, textAlignClass } = useAdminMemberDetailCopy();

  const [member, setMember] = useState<Member | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<AdminEditFormState | null>(null);
  const [editErrors, setEditErrors] = useState<AdminEditErrors>({});
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [officeBearerAssignments, setOfficeBearerAssignments] = useState<
    AdminOfficeBearerAssignment[]
  >([]);
  const [officeBearerCommittees, setOfficeBearerCommittees] = useState<
    CommitteeRecord[]
  >([]);
  const [officeBearerDesignations, setOfficeBearerDesignations] = useState<
    DesignationRecord[]
  >([]);
  const [officeBearerForm, setOfficeBearerForm] =
    useState<OfficeBearerIssueForm>(initialOfficeBearerIssueForm);
  const [officeBearerPanelOpen, setOfficeBearerPanelOpen] = useState(false);
  const [officeBearerLoading, setOfficeBearerLoading] = useState(false);
  const [officeBearerSaving, setOfficeBearerSaving] = useState(false);
  const [officeBearerError, setOfficeBearerError] = useState("");
  const [canManageOrganization, setCanManageOrganization] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const trimmedRejectionReason = useMemo(
    () => rejectionReason.trim(),
    [rejectionReason],
  );

  const canViewCard =
    member?.status === "approved" && Boolean(member.member_no);
  const canIssueOfficeBearer = canViewCard && canManageOrganization;
  const hasActiveOfficeBearer = officeBearerAssignments.some(
    (assignment) => assignment.status === "active",
  );
  const selectedOfficeBearerCommittee = officeBearerCommittees.find(
    (committee) => committee.id === officeBearerForm.committeeId,
  );
  const scopedOfficeBearerDesignations = officeBearerDesignations.filter(
    (designation) =>
      designation.is_active &&
      (!selectedOfficeBearerCommittee ||
        designation.scope === selectedOfficeBearerCommittee.committee_type),
  );
  const canEditApplication = Boolean(member);
  const reasonTooShort =
    trimmedRejectionReason.length > 0 &&
    trimmedRejectionReason.length < MIN_REJECTION_REASON_LENGTH;

  const loadMember = useCallback(
    async (
      cancelledRef?: { current: boolean },
      options?: { silent?: boolean },
    ) => {
      const silent = options?.silent ?? false;

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const access = await ensureAdminAccess();

        if (!access.ok) {
          if (!cancelledRef?.current) {
            await navigate({ to: access.redirectTo });
          }

          return;
        }

        const canManageOrg = await currentUserCanManageCommittees().catch(
          () => false,
        );

        if (!cancelledRef?.current) {
          setCanManageOrganization(canManageOrg);
        }

        const safeMember = await fetchMemberById(id);

        if (!safeMember) {
          throw new Error(copy.memberNotFound);
        }

        const signedPhotoUrl = await createSignedPhotoUrl(safeMember.photo_url);
        if (cancelledRef?.current) return;

        setMember(safeMember);
        setEditForm(memberToAdminEditForm(safeMember));
        setEditErrors({});
        setEditPhoto(null);
        if (editPhotoPreview?.startsWith("blob:")) {
          URL.revokeObjectURL(editPhotoPreview);
        }
        setEditPhotoPreview(null);
        if (!safeMember.status) {
          setEditMode(false);
        }
        setPhotoUrl(signedPhotoUrl);
      } catch (err) {
        if (!cancelledRef?.current) {
          setError(
            err instanceof Error ? err.message : "Failed to load member.",
          );
          setMember(null);
          setPhotoUrl(null);
          setCanManageOrganization(false);
        }
      } finally {
        if (!cancelledRef?.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [id, navigate],
  );

  useEffect(() => {
    const cancelledRef = { current: false };

    void loadMember(cancelledRef);

    return () => {
      cancelledRef.current = true;
    };
  }, [loadMember]);

  useEffect(() => {
    if (!member?.id || !canIssueOfficeBearer) {
      setOfficeBearerAssignments([]);
      return;
    }

    void loadOfficeBearerIssueData(member.id);
  }, [member?.id, canIssueOfficeBearer]);

  useEffect(() => {
    return () => {
      if (editPhotoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(editPhotoPreview);
      }
    };
  }, [editPhotoPreview]);

  function startEditMode() {
    if (!member || !canEditApplication) return;

    setEditForm(memberToAdminEditForm(member));
    setEditErrors({});
    setEditPhoto(null);
    if (editPhotoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(editPhotoPreview);
    }
    setEditPhotoPreview(null);
    setError("");
    setSuccess("");
    setEditMode(true);
  }

  function cancelEditMode() {
    if (editPhotoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(editPhotoPreview);
    }

    setEditForm(member ? memberToAdminEditForm(member) : null);
    setEditErrors({});
    setEditPhoto(null);
    setEditPhotoPreview(null);
    setEditMode(false);
    setError("");
  }

  function updateEditField<K extends keyof AdminEditFormState>(
    field: K,
    value: AdminEditFormState[K],
  ) {
    setEditForm((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );

    setEditErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });

    setError("");
    setSuccess("");
  }

  function handleAdminPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setSuccess("");
    setEditPhoto(null);

    if (editPhotoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(editPhotoPreview);
      setEditPhotoPreview(null);
    }

    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!MEMBER_PHOTO_ALLOWED_TYPES.includes(file.type)) {
      setEditErrors((current) => ({
        ...current,
        photo: "Upload PNG, JPG or WebP image only.",
      }));
      event.target.value = "";
      return;
    }

    if (file.size > MEMBER_PHOTO_MAX_SIZE_BYTES) {
      setEditErrors((current) => ({
        ...current,
        photo: "Profile photo must be 2MB or smaller.",
      }));
      event.target.value = "";
      return;
    }

    setEditPhoto(file);
    setEditPhotoPreview(URL.createObjectURL(file));
    setEditErrors((current) => {
      const next = { ...current };
      delete next.photo;
      return next;
    });
  }

  async function handleAdminEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!member || !editForm || !canEditApplication || editSaving) return;

    const validationErrors = validateAdminEditForm(editForm);
    setEditErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setError("Please fix the highlighted application fields before saving.");
      return;
    }

    setEditSaving(true);
    setError("");
    setSuccess("");

    try {
      let photoPath = member.photo_url;

      if (editPhoto) {
        const extension =
          editPhoto.name.split(".").pop()?.toLowerCase() || "jpg";
        photoPath = `${member.user_id}/admin-photo-${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(MEMBER_PHOTO_BUCKET)
          .upload(photoPath, editPhoto, {
            upsert: true,
            contentType: editPhoto.type || "image/jpeg",
          });

        if (uploadError) throw uploadError;
      }

      const payload = {
        full_name: editForm.fullName.trim(),
        father_name: editForm.fatherName.trim(),
        cnic: editForm.cnic.trim(),
        mobile: normalizeMobile(editForm.mobile),
        district: editForm.district.trim(),
        taluka: optionalText(editForm.taluka),
        address: editForm.address.trim(),
        date_of_birth: editForm.dateOfBirth || null,
        gender: optionalText(editForm.gender),
        education: optionalText(editForm.education),
        blood_group: optionalText(editForm.bloodGroup),
        profession: optionalText(editForm.profession),
        caste_branch: optionalText(editForm.casteBranch),
        emergency_contact_name: optionalText(editForm.emergencyContactName),
        emergency_contact_relation: optionalText(
          editForm.emergencyContactRelation,
        ),
        emergency_contact_mobile:
          normalizeMobile(editForm.emergencyContactMobile) || null,
        declaration_accepted: editForm.declarationAccepted,
        photo_url: photoPath ?? "",
      };

      const accessToken = await getAccessToken();
      const result = await updateMemberApplicationAction({
        data: {
          memberId: member.id,
          accessToken,
          payload,
        },
      });

      const nextMember = result.member as unknown as Member;
      const signedPhotoUrl = await createSignedPhotoUrl(nextMember.photo_url);

      if (editPhotoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(editPhotoPreview);
      }

      setMember(nextMember);
      setEditForm(memberToAdminEditForm(nextMember));
      setPhotoUrl(signedPhotoUrl);
      setEditPhoto(null);
      setEditPhotoPreview(null);
      setEditErrors({});
      setEditMode(false);
      setSuccess("Application details updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update application details.",
      );
    } finally {
      setEditSaving(false);
    }
  }

  function openOfficeBearerPanel() {
    if (!canIssueOfficeBearer) return;

    setOfficeBearerPanelOpen(true);

    window.setTimeout(() => {
      document.getElementById("office-bearer-issue-panel")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  async function loadOfficeBearerIssueData(memberId: string) {
    setOfficeBearerLoading(true);
    setOfficeBearerError("");

    try {
      const [committees, designations, assignments] = await Promise.all([
        fetchCommitteesForAdmin(),
        fetchDesignations(),
        fetchOfficeBearerAssignments(memberId),
      ]);

      setOfficeBearerCommittees(committees);
      setOfficeBearerDesignations(designations);
      setOfficeBearerAssignments(assignments);
    } catch (err) {
      setOfficeBearerError(
        err instanceof Error
          ? err.message
          : "Unable to load designation assignment data.",
      );
    } finally {
      setOfficeBearerLoading(false);
    }
  }

  function updateOfficeBearerForm(fields: Partial<OfficeBearerIssueForm>) {
    setOfficeBearerForm((current) => ({ ...current, ...fields }));
    setOfficeBearerError("");
    setSuccess("");
  }

  function handleOfficeBearerCommitteeChange(committeeId: string) {
    const committee = officeBearerCommittees.find(
      (item) => item.id === committeeId,
    );

    setOfficeBearerForm((current) => ({
      ...current,
      committeeId,
      designationId: "",
      designationTitle: "",
      tenureStart:
        committee?.tenure_start ?? (current.tenureStart || todayDate()),
      tenureEnd: committee?.tenure_end ?? "",
    }));
    setOfficeBearerError("");
    setSuccess("");
  }

  function handleOfficeBearerDesignationChange(designationId: string) {
    const designation = officeBearerDesignations.find(
      (item) => item.id === designationId,
    );

    setOfficeBearerForm((current) => ({
      ...current,
      designationId,
      designationTitle: designation?.title ?? current.designationTitle,
    }));
    setOfficeBearerError("");
    setSuccess("");
  }

  async function handleIssueOfficeBearerSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!member || !canIssueOfficeBearer || officeBearerSaving) return;

    const selectedCommittee = officeBearerCommittees.find(
      (committee) => committee.id === officeBearerForm.committeeId,
    );
    const designationTitle = officeBearerForm.designationTitle.trim();
    const sortOrder = Number.parseInt(officeBearerForm.sortOrder, 10);

    if (!selectedCommittee) {
      setOfficeBearerError("Select a level first.");
      return;
    }

    if (selectedCommittee.status !== "active") {
      setOfficeBearerError(
        "Designation can only be assigned from an active level.",
      );
      return;
    }

    if (!designationTitle) {
      setOfficeBearerError("Designation title is required.");
      return;
    }

    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      setOfficeBearerError("Display order must be a valid positive number.");
      return;
    }

    const duplicateActiveCommitteeRole = officeBearerAssignments.find(
      (assignment) =>
        assignment.committee_id === selectedCommittee.id &&
        assignment.status === "active",
    );

    if (duplicateActiveCommitteeRole) {
      setOfficeBearerError(
        `This member already has an active ${duplicateActiveCommitteeRole.designation_title} role in this committee. Open the committee detail page to edit the existing role.`,
      );
      return;
    }

    setOfficeBearerSaving(true);
    setOfficeBearerError("");
    setError("");
    setSuccess("");

    try {
      await addCommitteeMember({
        committee_id: selectedCommittee.id,
        member: memberToCommitteeSearchResult(member),
        designation_id: officeBearerForm.designationId || null,
        designation_title: designationTitle,
        status: officeBearerForm.status,
        sort_order: sortOrder,
        tenure_start: officeBearerForm.tenureStart || null,
        tenure_end: officeBearerForm.tenureEnd || null,
        appointment_notes: officeBearerForm.appointmentNotes.trim() || null,
      });

      await loadOfficeBearerIssueData(member.id);
      setOfficeBearerForm({
        ...initialOfficeBearerIssueForm,
        tenureStart: todayDate(),
      });
      setOfficeBearerPanelOpen(false);
      setSuccess(
        "Designation assigned successfully. It will now appear on the member’s membership card.",
      );
    } catch (err) {
      setOfficeBearerError(
        err instanceof Error ? err.message : "Failed to assign designation.",
      );
    } finally {
      setOfficeBearerSaving(false);
    }
  }

  async function handleApprove() {
    if (!member || actionLoading) return;

    const confirmed = window.confirm(
      `Approve ${member.full_name}? This will issue/activate membership and enable the digital card when member number is available.`,
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const accessToken = await getAccessToken();

      await approveMemberAction({
        data: {
          memberId: member.id,
          accessToken,
        },
      });

      setSuccess("Member approved successfully.");
      await loadMember(undefined, { silent: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to approve member.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (
      !member ||
      actionLoading ||
      trimmedRejectionReason.length < MIN_REJECTION_REASON_LENGTH
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Reject ${member.full_name}? The member will need to update and resubmit the application.`,
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const accessToken = await getAccessToken();

      await rejectMemberAction({
        data: {
          memberId: member.id,
          rejectionReason: trimmedRejectionReason,
          accessToken,
        },
      });

      setRejectionReason("");
      setSuccess("Application rejected with reason.");
      await loadMember(undefined, { silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject member.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminShell
        title="Member Detail"
        subtitle="Review free membership application, profile data and digital card status."
      >
        <div className="admin-nested-page">
          <div className="page-wrap rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
              {copy.loading}
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  if (!member) {
    return (
      <AdminShell
        title="Member Detail"
        subtitle="Review free membership application, profile data and digital card status."
      >
        <div className="admin-nested-page">
          <div className="page-wrap space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
            <BackToAdmin />

            <div className="rounded-2xl bg-red-50 p-5 ring-1 ring-red-100">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                <div>
                  <h1 className="text-xl font-black text-red-900">
                    {copy.memberNotFound}
                  </h1>
                  <p className="mt-2 text-sm leading-6 text-red-700">
                    {error || copy.memberNotFoundText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Member Detail"
      subtitle="Review free membership application, profile data and digital card status."
    >
      <div className="admin-nested-page">
        <div className="page-wrap space-y-6">
          <header className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 sm:p-7">
              <BackToAdmin />

              <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                <div className={`min-w-0 ${textAlignClass}`} dir={textDir}>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                    {copy.pageEyebrow}
                  </p>

                  <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {member.full_name}
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {copy.cnic}:{" "}
                    <span className="font-bold text-slate-800">
                      {formatCnic(member.cnic)}
                    </span>{" "}
                    · {copy.district}:{" "}
                    <span className="font-bold text-slate-800">
                      {member.district}
                      {member.taluka ? ` / ${member.taluka}` : ""}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {copy.memberNo}:{" "}
                    <span className="font-bold text-slate-900">
                      {member.member_no || copy.notIssuedYet}
                    </span>
                  </p>
                </div>

                <div className="flex flex-col items-start gap-3 lg:items-end">
                  <StatusBadge status={member.status} />

                  <div className="grid w-full gap-2 sm:grid-cols-2 xl:flex xl:w-auto">
                    <button
                      type="button"
                      onClick={() =>
                        void loadMember(undefined, { silent: true })
                      }
                      disabled={refreshing}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                      />
                      {copy.refresh}
                    </button>

                    {canEditApplication ? (
                      <button
                        type="button"
                        onClick={startEditMode}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700"
                      >
                        <IdCard className="h-4 w-4" />
                        Edit Application
                      </button>
                    ) : null}

                    {canViewCard ? (
                      <>
                        <Link
                          to="/admin/members/$id/card"
                          params={{ id: member.id }}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold !text-white no-underline shadow-sm transition hover:bg-slate-800 hover:!text-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                          style={{ color: "#ffffff" }}
                        >
                          <CreditCard className="h-4 w-4" />
                          {copy.viewCard}
                        </Link>

                        {canIssueOfficeBearer ? (
                          <button
                            type="button"
                            onClick={openOfficeBearerPanel}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2 text-sm font-bold text-amber-950 shadow-sm transition hover:bg-amber-100"
                          >
                            <BriefcaseBusiness className="h-4 w-4" />
                            Assign Designation
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  {!canViewCard ? (
                    <p className="max-w-xs text-left text-xs leading-5 text-slate-500 lg:text-right">
                      {copy.digitalCardUnavailable}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
              <SummaryItem
                label={copy.summary.status}
                value={getStatusLabel(member.status, copy)}
                icon={<ShieldCheck className="h-4 w-4" />}
              />
              <SummaryItem
                label={copy.summary.memberNo}
                value={member.member_no || copy.notIssued}
                icon={<IdCard className="h-4 w-4" />}
              />
              <SummaryItem
                label={copy.summary.submitted}
                value={formatDate(member.created_at, true) || copy.notProvided}
                icon={<CalendarDays className="h-4 w-4" />}
              />
              <SummaryItem
                label={copy.summary.reviewed}
                value={
                  formatDate(member.reviewed_at || member.approved_at, true) ||
                  copy.notReviewed
                }
                icon={<Clock className="h-4 w-4" />}
              />
            </div>
          </header>

          {error ? (
            <AlertBox tone="error" icon={<AlertCircle className="h-5 w-5" />}>
              {error}
            </AlertBox>
          ) : null}

          {success ? (
            <AlertBox
              tone="success"
              icon={<CheckCircle2 className="h-5 w-5" />}
            >
              {success}
            </AlertBox>
          ) : null}

          <StatusPanel member={member} />

          <FreeMembershipNotice />

          <AdminMemberProfilePanel
            copy={copy}
            member={member}
            photoUrl={photoUrl}
            editMode={editMode}
            editForm={editForm}
            editErrors={editErrors}
            editPhotoPreview={editPhotoPreview}
            selectedPhotoName={editPhoto?.name ?? ""}
            editSaving={editSaving}
            canEditApplication={canEditApplication}
            canViewCard={canViewCard}
            canIssueOfficeBearer={canIssueOfficeBearer}
            onOpenOfficeBearerPanel={openOfficeBearerPanel}
            onEditChange={updateEditField}
            onPhotoChange={handleAdminPhotoChange}
            onEditSubmit={handleAdminEditSubmit}
            onEditCancel={cancelEditMode}
          />

          {canIssueOfficeBearer ? (
            <OfficeBearerIssuePanel
              member={member}
              assignments={officeBearerAssignments}
              committees={officeBearerCommittees}
              designations={scopedOfficeBearerDesignations}
              selectedCommittee={selectedOfficeBearerCommittee ?? null}
              form={officeBearerForm}
              loading={officeBearerLoading}
              saving={officeBearerSaving}
              error={officeBearerError}
              isOpen={officeBearerPanelOpen}
              hasActiveOfficeBearer={hasActiveOfficeBearer}
              onOpenChange={setOfficeBearerPanelOpen}
              onRefresh={() => void loadOfficeBearerIssueData(member.id)}
              onCommitteeChange={handleOfficeBearerCommitteeChange}
              onDesignationChange={handleOfficeBearerDesignationChange}
              onFormChange={updateOfficeBearerForm}
              onSubmit={handleIssueOfficeBearerSubmit}
            />
          ) : null}

          <AdminMemberReviewPanel
            member={member}
            copy={copy}
            canViewCard={canViewCard}
            actionLoading={actionLoading}
            rejectionReason={rejectionReason}
            trimmedRejectionReason={trimmedRejectionReason}
            reasonTooShort={reasonTooShort}
            minRejectionReasonLength={MIN_REJECTION_REASON_LENGTH}
            onApprove={handleApprove}
            onReject={handleReject}
            onRejectionReasonChange={setRejectionReason}
          />
        </div>
      </div>
    </AdminShell>
  );
}

function BackToAdmin() {
  const { copy, iconBeforeClass } = useAdminMemberDetailCopy();

  return (
    <Link
      to="/admin"
      className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 no-underline hover:text-emerald-800"
    >
      <ArrowLeft className={`h-4 w-4 ${iconBeforeClass}`} />
      {copy.backToAdmin}
    </Link>
  );
}

function AlertBox({
  tone,
  icon,
  children,
}: {
  tone: "error" | "success";
  icon: ReactNode;
  children: ReactNode;
}) {
  const classes =
    tone === "error"
      ? "bg-red-50 text-red-700 ring-red-100"
      : "bg-emerald-50 text-emerald-700 ring-emerald-100";

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-medium ring-1 ${classes}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 break-all text-sm font-black text-slate-950">
            {value}
          </p>
        </div>

        <span className="text-emerald-700">{icon}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: MemberStatus }) {
  const { copy } = useAdminMemberDetailCopy();

  const config: Record<
    MemberStatus,
    {
      icon: ReactNode;
      className: string;
      text: string;
    }
  > = {
    pending: {
      icon: <Hourglass className="h-3.5 w-3.5" />,
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      text: copy.status.pending,
    },
    approved: {
      icon: <BadgeCheck className="h-3.5 w-3.5" />,
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      text: copy.status.approved,
    },
    rejected: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      className: "bg-red-50 text-red-700 ring-red-200",
      text: copy.status.rejected,
    },
  };

  const item = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${item.className}`}
    >
      {item.icon}
      {item.text}
    </span>
  );
}

