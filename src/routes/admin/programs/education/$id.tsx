import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeIndianRupee,
  CalendarDays,
  ClipboardCheck,
  Download,
  FileText,
  GraduationCap,
  Loader2,
  Save,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase/client"
import { useAdminProgramsCopy } from "../../../../lib/admin-programs-i18n";
import {
  EDUCATION_DOCUMENT_BUCKET,
  formatEducationFileSize,
  getEducationDocumentLabel,
  getEducationDocumentStatusClass,
  getEducationDocumentStatusLabel,
  getEducationStatusClass,
  getEducationStatusLabel,
  type EducationApplicationDetails,
  type EducationDocumentRecord,
} from "../../../../lib/programs/education";

export const Route = createFileRoute("/admin/programs/education/$id")({
  component: AdminEducationApplicationDetailPage,
});

const statusOptions = [
  "submitted",
  "under_review",
  "need_more_info",
  "approved",
  "rejected",
  "paid_completed",
  "completed",
] as const;

const documentStatusOptions = [
  "pending",
  "verified",
  "rejected",
  "needs_reupload",
] as const;

type ProgramApplicationStatus = (typeof statusOptions)[number];
type DocumentStatus = (typeof documentStatusOptions)[number];

type EducationApplicationDetail = {
  id: string;
  application_no: string | null;
  program_key: string;
  applicant_user_id: string;
  member_id: string | null;
  membership_no: string;
  relationship_to_member: string;
  applicant_name: string;
  applicant_cnic: string | null;
  phone: string;
  email: string | null;
  district: string | null;
  taluka: string | null;
  address: string | null;
  details: EducationApplicationDetails | null;
  status: ProgramApplicationStatus;
  assigned_admin_id: string | null;
  admin_remarks: string | null;
  approved_amount: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function AdminEducationApplicationDetailPage() {
  const { copy } = useAdminProgramsCopy('education')
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [application, setApplication] =
    useState<EducationApplicationDetail | null>(null);
  const [documents, setDocuments] = useState<EducationDocumentRecord[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documentSavingId, setDocumentSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [status, setStatus] = useState<ProgramApplicationStatus>("submitted");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [assignedAdminId, setAssignedAdminId] = useState("");
  const [adminRemarks, setAdminRemarks] = useState("");

  useEffect(() => {
    void loadApplication();
  }, [id]);

  async function loadApplication() {
    setLoading(true);
    setMessage("");
    setSignedUrls({});

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Admin application detail dekhne ke liye pehle login karen.");
      setApplication(null);
      setDocuments([]);
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from("program_applications")
      .select("*")
      .eq("id", id)
      .eq("program_key", "education")
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setApplication(null);
      setDocuments([]);
      setLoading(false);
      return;
    }

    if (!data) {
      setMessage("Education application not found.");
      setApplication(null);
      setDocuments([]);
      setLoading(false);
      return;
    }

    const row = data as unknown as EducationApplicationDetail;

    setApplication(row);
    setStatus(row.status as ProgramApplicationStatus);
    setApprovedAmount(row.approved_amount ? String(row.approved_amount) : "");
    setAssignedAdminId(row.assigned_admin_id || "");
    setAdminRemarks(row.admin_remarks || "");

    await loadDocuments(row.id);

    setLoading(false);
  }

  async function loadDocuments(applicationId: string) {
    const { data, error } = await supabase
      .from("program_documents")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(error.message);
      setDocuments([]);
      return;
    }

    const safeDocuments = (data || []) as unknown as EducationDocumentRecord[];
    setDocuments(safeDocuments);

    const nextSignedUrls = await createSignedUrls(safeDocuments);
    setSignedUrls(nextSignedUrls);
  }

  async function createSignedUrls(items: EducationDocumentRecord[]) {
    const entries = await Promise.all(
      items.map(async (document) => {
        const { data, error } = await supabase.storage
          .from(EDUCATION_DOCUMENT_BUCKET)
          .createSignedUrl(document.file_path, 60 * 60);

        if (error || !data?.signedUrl) return null;

        return [document.id, data.signedUrl] as const;
      }),
    );

    return Object.fromEntries(
      entries.filter(Boolean) as Array<readonly [string, string]>,
    );
  }

  const details = useMemo<EducationApplicationDetails>(
    () => application?.details || {},
    [application],
  );

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!application) return;

    setSaving(true);
    setMessage("");

    const numericApprovedAmount =
      approvedAmount.trim().length > 0 ? Number(approvedAmount) : null;

    if (
      numericApprovedAmount !== null &&
      (Number.isNaN(numericApprovedAmount) || numericApprovedAmount < 0)
    ) {
      setMessage("Approved amount valid number hona chahiye.");
      setSaving(false);
      return;
    }

    const payload: {
      status: ProgramApplicationStatus;
      admin_remarks: string | null;
      approved_amount: number | null;
      assigned_admin_id: string | null;
      reviewed_at: string;
      approved_at?: string | null;
      completed_at?: string | null;
    } = {
      status,
      admin_remarks: adminRemarks.trim() || null,
      approved_amount: numericApprovedAmount,
      assigned_admin_id: assignedAdminId || null,
      reviewed_at: new Date().toISOString(),
    };

    if (status === "approved") {
      payload.approved_at = new Date().toISOString();
    }

    if (status === "paid_completed" || status === "completed") {
      payload.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("program_applications")
      .update(payload)
      .eq("id", application.id)
      .eq("program_key", "education");

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    if (status === "approved") {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: documentVerifyError } = await supabase
        .from("program_documents")
        .update({
          verification_status: "verified",
          is_verified: true,
          verified_by: user?.id ?? null,
          verified_at: new Date().toISOString(),
          admin_note: "Verified during application approval.",
        })
        .eq("application_id", application.id)
        .eq("program_key", "education");

      if (documentVerifyError) {
        setMessage(
          `Application approved, lekin documents verify nahi ho sake: ${documentVerifyError.message}`,
        );
        setSaving(false);
        await loadApplication();
        return;
      }
    }

    setSaving(false);
    await loadApplication();
    setMessage(
      status === "approved"
        ? "Application approved and all documents verified successfully."
        : "Application review saved successfully.",
    );
  }

  async function handleDocumentSave({
    documentId,
    nextStatus,
    adminNote,
  }: {
    documentId: string;
    nextStatus: DocumentStatus;
    adminNote: string;
  }) {
    setDocumentSavingId(documentId);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Document verify karne ke liye login required hai.");
      setDocumentSavingId(null);
      return;
    }

    const { error } = await supabase
      .from("program_documents")
      .update({
        verification_status: nextStatus,
        is_verified: nextStatus === "verified",
        admin_note: adminNote.trim() || null,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (error) {
      setMessage(error.message);
      setDocumentSavingId(null);
      return;
    }

    if (application) {
      await loadDocuments(application.id);
    }

    setDocumentSavingId(null);
    setMessage("Document verification updated.");
  }

  function handleMarkUnderReview() {
    setStatus("under_review");
    setAdminRemarks((prev) => prev || "Application is now under review.");
  }

  function handleAssignToMe() {
    if (!currentUserId) {
      setMessage("Reviewer assign karne ke liye login required hai.");
      return;
    }

    setAssignedAdminId(currentUserId);
    setStatus((prev) => (prev === "submitted" ? "under_review" : prev));
    setAdminRemarks((prev) => prev || "Reviewer assigned and application is under review.");
  }

  function handleClearReviewer() {
    setAssignedAdminId("");
  }

  async function handleGoBack() {
    await navigate({ to: "/admin/programs/education" });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-slate-950 px-4 py-10 text-white md:py-14">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center text-sm font-bold text-amber-300 transition hover:text-amber-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {copy.program.detailBack}
          </button>

          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
                <GraduationCap className="h-4 w-4 text-amber-300" />
                Application Review
              </div>

              <h1 className="mt-5 text-4xl font-black md:text-6xl">
                {copy.program.detailBadge}
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">
                Student details, uploaded documents, support request and admin
                decision.
              </p>
            </div>

            {application ? (
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm">
                <p className="font-black text-white">
                  {application.application_no || "Application"}
                </p>
                <p className="mt-1 text-white/70">
                  Submitted:{" "}
                  {new Date(application.created_at).toLocaleDateString()}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-14">
        <div className="mx-auto max-w-7xl">
          {loading ? (
            <div className="flex justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            </div>
          ) : !application ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-800 shadow-sm">
              <h2 className="text-2xl font-black">{copy.common.applicationNotAvailable}</h2>
              <p className="mt-3 font-semibold">{message}</p>

              <Link
                to="/admin/programs/education"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-700 px-5 py-3 font-black !text-white no-underline"
                style={{ color: "#ffffff" }}
              >
                Back to Applications
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <div className="space-y-6">
                <SummaryCard application={application} />

                <InfoSection
                  title={copy.program.studentDetails}
                  icon={<User className="h-5 w-5" />}
                  items={[
                    [copy.program.studentName, application.applicant_name],
                    ["CNIC / B-form", application.applicant_cnic || "-"],
                    ["Phone", application.phone],
                    ["Email", application.email || "-"],
                    ["Relationship", application.relationship_to_member],
                    [copy.common.membershipNo, application.membership_no],
                    ["District", application.district || "-"],
                    ["Taluka", application.taluka || "-"],
                    ["Address", application.address || "-"],
                  ]}
                />

                <InfoSection
                  title={copy.program.academicDetails}
                  icon={<ClipboardCheck className="h-5 w-5" />}
                  items={[
                    ["Guardian Name", details.guardian_name || "-"],
                    ["Institute Name", details.institute_name || "-"],
                    ["Institute Type", details.institute_type || "-"],
                    ["Class / Degree", details.class_degree || "-"],
                    ["Board / University", details.board_university || "-"],
                    ["Academic Year", details.academic_year || "-"],
                    ["Last Exam", details.last_exam || "-"],
                    ["Total Marks", details.total_marks || "-"],
                    ["Obtained Marks", details.obtained_marks || "-"],
                    ["Percentage / GPA", details.percentage || "-"],
                  ]}
                />

                <InfoSection
                  title={copy.program.supportRequest}
                  icon={<BadgeIndianRupee className="h-5 w-5" />}
                  items={[
                    [copy.program.supportType, details.support_type || "-"],
                    [
                      "Required Amount",
                      details.required_amount
                        ? `Rs. ${details.required_amount}`
                        : "-",
                    ],
                    ["Reason / Need Details", details.reason || "-"],
                  ]}
                />

                <DocumentsReviewSection
                  documents={documents}
                  signedUrls={signedUrls}
                  savingId={documentSavingId}
                  onSave={handleDocumentSave}
                />

                <InfoSection
                  title="Timeline"
                  icon={<CalendarDays className="h-5 w-5" />}
                  items={[
                    [
                      copy.common.submittedAt,
                      application.submitted_at
                        ? new Date(application.submitted_at).toLocaleString()
                        : "-",
                    ],
                    [
                      "Reviewed At",
                      application.reviewed_at
                        ? new Date(application.reviewed_at).toLocaleString()
                        : "-",
                    ],
                    [
                      "Approved At",
                      application.approved_at
                        ? new Date(application.approved_at).toLocaleString()
                        : "-",
                    ],
                    [
                      "Completed At",
                      application.completed_at
                        ? new Date(application.completed_at).toLocaleString()
                        : "-",
                    ],
                  ]}
                />
              </div>

              <aside className="lg:sticky lg:top-6 lg:self-start">
                <form
                  onSubmit={handleSave}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-5">
                    <h2 className="text-2xl font-black text-slate-950">
                      Admin Review
                    </h2>

                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Status update, approved amount aur admin remarks yahan
                      save karen.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-slate-700">
                        Status
                      </span>

                      <select
                        value={status}
                        onChange={(event) =>
                          setStatus(
                            event.target.value as ProgramApplicationStatus,
                          )
                        }
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500"
                      >
                        {statusOptions.map((item) => (
                          <option key={item} value={item}>
                            {getEducationStatusLabel(item)}
                          </option>
                        ))}
                      </select>
                    </label>


                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-amber-700">
                          <UserPlus className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-slate-800">
                            Assigned Reviewer
                          </p>
                          <p className="mt-1 break-all text-xs font-semibold text-slate-500">
                            {assignedAdminId
                              ? assignedAdminId === currentUserId
                                ? "Assigned to you"
                                : `Assigned: ${assignedAdminId}`
                              : "No reviewer assigned yet"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={handleAssignToMe}
                          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-900"
                        >
                          {copy.common.assignToMe}
                        </button>

                        <button
                          type="button"
                          onClick={handleClearReviewer}
                          className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm font-black text-slate-700">
                        {copy.common.approvedAmount}
                      </span>

                      <input
                        value={approvedAmount}
                        onChange={(event) =>
                          setApprovedAmount(event.target.value)
                        }
                        placeholder="e.g. 5000"
                        type="number"
                        min="0"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500"
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-sm font-black text-slate-700">
                        Admin Remarks
                      </span>

                      <textarea
                        value={adminRemarks}
                        onChange={(event) => setAdminRemarks(event.target.value)}
                        placeholder="Add review remarks, missing document note, approval reason, or rejection reason..."
                        rows={7}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500"
                      />
                    </label>

                    {message ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                        {message}
                      </div>
                    ) : null}

                    <div className="grid gap-3">
                      <button
                        type="button"
                        onClick={handleMarkUnderReview}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-800 transition hover:bg-slate-50"
                      >
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Set Under Review
                      </button>

                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
                      >
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {copy.common.saveReview}
                      </button>
                    </div>
                  </div>
                </form>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  application,
}: {
  application: EducationApplicationDetail;
}) {
  const { copy } = useAdminProgramsCopy('education')

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {application.application_no || "Application"}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${getEducationStatusClass(
                application.status,
              )}`}
            >
              {getEducationStatusLabel(application.status)}
            </span>
          </div>

          <h2 className="mt-4 text-3xl font-black text-slate-950">
            {application.applicant_name}
          </h2>

          <p className="mt-2 font-semibold text-slate-500">
            {copy.common.membershipNo}: {application.membership_no}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Reviewer: {application.assigned_admin_id ? "Assigned" : "Unassigned"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 md:text-right">
          <p className="font-black text-slate-950">
            {application.approved_amount
              ? `Rs. ${Number(application.approved_amount)}`
              : "Amount Pending"}
          </p>
          <p className="mt-1">{copy.common.approvedAmount}</p>
        </div>
      </div>

      {application.admin_remarks ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Current Admin Remarks:</strong> {application.admin_remarks}
        </div>
      ) : null}
    </section>
  );
}

function DocumentsReviewSection({
  documents,
  signedUrls,
  savingId,
  onSave,
}: {
  documents: EducationDocumentRecord[];
  signedUrls: Record<string, string>;
  savingId: string | null;
  onSave: (args: {
    documentId: string;
    nextStatus: DocumentStatus;
    adminNote: string;
  }) => Promise<void>;
}) {
  const { copy } = useAdminProgramsCopy('education')

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <FileText className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-950">
            {copy.common.documentVerification}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Uploaded documents open karen, verify/reject karen, aur admin note
            save karen.
          </p>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-600">
          No documents uploaded with this application.
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((document) => (
            <DocumentReviewCard
              key={document.id}
              document={document}
              signedUrl={signedUrls[document.id]}
              saving={savingId === document.id}
              onSave={onSave}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function DocumentReviewCard({
  document,
  signedUrl,
  saving,
  onSave,
}: {
  document: EducationDocumentRecord;
  signedUrl?: string;
  saving: boolean;
  onSave: (args: {
    documentId: string;
    nextStatus: DocumentStatus;
    adminNote: string;
  }) => Promise<void>;
}) {
  const { copy } = useAdminProgramsCopy('education')

  const [nextStatus, setNextStatus] = useState<DocumentStatus>(
    normalizeDocumentStatus(document.verification_status),
  );
  const [adminNote, setAdminNote] = useState(document.admin_note || "");

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-slate-950">
              {getEducationDocumentLabel(document.document_type)}
            </h3>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${getEducationDocumentStatusClass(
                document.verification_status,
              )}`}
            >
              {getEducationDocumentStatusLabel(document.verification_status)}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            {document.file_name || "Uploaded file"} ·{" "}
            {formatEducationFileSize(document.file_size)}
          </p>

          {signedUrl ? (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-black !text-white no-underline transition hover:bg-emerald-900 hover:!text-white"
              style={{ color: "#ffffff" }}
            >
              <Download className="mr-2 h-4 w-4" />
              Open Document
            </a>
          ) : (
            <span className="mt-4 inline-flex rounded-xl bg-slate-200 px-5 py-3 text-sm font-black text-slate-600">
              File unavailable
            </span>
          )}
        </div>

        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm font-black text-slate-700">
              Verification Status
            </span>

            <select
              value={nextStatus}
              onChange={(event) =>
                setNextStatus(event.target.value as DocumentStatus)
              }
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500"
            >
              {documentStatusOptions.map((item) => (
                <option key={item} value={item}>
                  {getEducationDocumentStatusLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-black text-slate-700">
              Admin Note
            </span>

            <textarea
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder={copy.common.documentNote}
              rows={3}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500"
            />
          </label>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              onSave({
                documentId: document.id,
                nextStatus,
                adminNote,
              })
            }
            className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Document
          </button>
        </div>
      </div>
    </article>
  );
}

function normalizeDocumentStatus(status: string): DocumentStatus {
  if (
    status === "verified" ||
    status === "rejected" ||
    status === "needs_reupload" ||
    status === "pending"
  ) {
    return status;
  }

  return "pending";
}

function InfoSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<[string, string]>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          {icon}
        </div>
        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              {label}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}