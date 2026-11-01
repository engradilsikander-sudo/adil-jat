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
  ShieldCheck,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { useProgramTrackingCopy } from "../../../lib/program-tracking-i18n";
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
} from "../../../lib/programs/education";

export const Route = createFileRoute("/programs/education/$id")({
  component: EducationApplicationDetailPage,
});

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
  status: string;
  admin_remarks: string | null;
  approved_amount: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function EducationApplicationDetailPage() {
  const { copy, textDir, textAlignClass, iconBeforeClass } = useProgramTrackingCopy("education");
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [application, setApplication] =
    useState<EducationApplicationDetail | null>(null);
  const [documents, setDocuments] = useState<EducationDocumentRecord[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
      setMessage("Application detail dekhne ke liye pehle login karen.");
      setApplication(null);
      setDocuments([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("program_applications")
      .select("*")
      .eq("id", id)
      .eq("program_key", "education")
      .eq("applicant_user_id", user.id)
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

    const { data: documentRows, error: documentError } = await supabase
      .from("program_documents")
      .select("*")
      .eq("application_id", row.id)
      .order("created_at", { ascending: true });

    if (documentError) {
      setMessage(documentError.message);
      setDocuments([]);
      setLoading(false);
      return;
    }

    const safeDocuments = (documentRows || []) as unknown as EducationDocumentRecord[];
    setDocuments(safeDocuments);

    const nextSignedUrls = await createSignedUrls(safeDocuments);
    setSignedUrls(nextSignedUrls);

    setLoading(false);
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

  async function handleBack() {
    await navigate({ to: "/programs/education/my-applications" });
  }

  return (
    <main className="min-h-screen bg-slate-50" dir="ltr">
      <section className="bg-slate-950 px-4 py-10 text-white md:py-14">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center text-sm font-bold text-amber-300 transition hover:text-amber-200"
          >
            <ArrowLeft className={`${iconBeforeClass} h-4 w-4`} />
            {copy.program.detailBack}
          </button>

          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className={textAlignClass} dir={textDir}>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
                <GraduationCap className="h-4 w-4 text-amber-300" />
                Education Application Detail
              </div>

              <h1 className="mt-5 text-4xl font-black md:text-6xl">
                Application Detail
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">
                Student details, support request, uploaded documents and admin
                decision yahan dekhen.
              </p>
            </div>

            {application ? (
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm">
                <p className="font-black text-white">
                  {application.application_no || "Application"}
                </p>
                <p className="mt-1 text-white/70">
                  {copy.common.submitted}:{" "}
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
              <h2 className="text-2xl font-black">Application not available</h2>
              <p className="mt-3 font-semibold">{message}</p>

              <Link
                to="/programs/education/my-applications"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-700 px-5 py-3 font-black text-white no-underline"
              >
                Back to Applications
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <SummaryCard
                application={application}
                labels={{
                  membershipNo: copy.common.membershipNo,
                  approvedAmount: copy.common.approvedAmount,
                  adminRemarks: copy.common.adminRemarks,
                }}
              />

                <InfoSection
                  title="Student / Applicant Details"
                  icon={<User className="h-5 w-5" />}
                  items={[
                    ["Student Name", application.applicant_name],
                    ["CNIC / B-form", application.applicant_cnic || "-"],
                    ["Phone", application.phone],
                    ["Email", application.email || "-"],
                    ["Relationship", application.relationship_to_member],
                    ["Membership No", application.membership_no],
                    ["District", application.district || "-"],
                    ["Taluka", application.taluka || "-"],
                    ["Address", application.address || "-"],
                  ]}
                />

                <InfoSection
                  title="Institute & {copy.program.academicDetails}"
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
                  title={copy.program.supportType}
                  icon={<BadgeIndianRupee className="h-5 w-5" />}
                  items={[
                    ["Support Type", details.support_type || "-"],
                    [
                      "Required Amount",
                      details.required_amount
                        ? `Rs. ${details.required_amount}`
                        : "-",
                    ],
                    ["Reason / Need Details", details.reason || "-"],
                  ]}
                />

                <DocumentsSection
                  documents={documents}
                  signedUrls={signedUrls}
                />
              </div>

              <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
                <StatusPanel application={application} />

                <InfoSection
                  title="Timeline"
                  icon={<CalendarDays className="h-5 w-5" />}
                  items={[
                    [
                      `${copy.common.submitted} At`,
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
  labels,
}: {
  application: EducationApplicationDetail;
  labels: {
    membershipNo: string;
    approvedAmount: string;
    adminRemarks: string;
  };
}) {
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
            {labels.membershipNo}: {application.membership_no}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 md:text-right">
          <p className="font-black text-slate-950">
            {application.approved_amount
              ? `Rs. ${Number(application.approved_amount)}`
              : "Amount Pending"}
          </p>
          <p className="mt-1">{labels.approvedAmount}</p>
        </div>
      </div>

      {application.admin_remarks ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>{labels.adminRemarks}:</strong> {application.admin_remarks}
        </div>
      ) : null}
    </section>
  );
}

function StatusPanel({
  application,
}: {
  application: EducationApplicationDetail;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <ShieldCheck className="h-5 w-5" />
      </div>

      <h2 className="text-2xl font-black text-slate-950">
        Application Status
      </h2>

      <span
        className={`mt-4 inline-flex rounded-full border px-4 py-2 text-sm font-black ${getEducationStatusClass(
          application.status,
        )}`}
      >
        {getEducationStatusLabel(application.status)}
      </span>

      <p className="mt-4 text-sm leading-7 text-slate-600">
        Admin review ke baad status yahan update hota rahega. Agar admin ne
        remarks add kiye hain to woh application summary me show honge.
      </p>
    </section>
  );
}

function DocumentsSection({
  documents,
  signedUrls,
}: {
  documents: EducationDocumentRecord[];
  signedUrls: Record<string, string>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <FileText className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-950">
            Uploaded Documents
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Admin verification status har document ke sath show hoga.
          </p>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-600">
          No documents found.
        </div>
      ) : (
        <div className="grid gap-3">
          {documents.map((document) => (
            <article
              key={document.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
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
                      {getEducationDocumentStatusLabel(
                        document.verification_status,
                      )}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-600">
                    {document.file_name || "Uploaded file"} ·{" "}
                    {formatEducationFileSize(document.file_size)}
                  </p>

                  {document.admin_note ? (
                    <p className="mt-2 rounded-xl bg-white p-3 text-sm text-slate-700">
                      <strong>Admin Note:</strong> {document.admin_note}
                    </p>
                  ) : null}
                </div>

                {signedUrls[document.id] ? (
                  <a
                    href={signedUrls[document.id]}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-black !text-white no-underline transition hover:bg-emerald-900 hover:!text-white"
style={{ color: "#ffffff" }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Open File
                  </a>
                ) : (
                  <span className="rounded-xl bg-slate-200 px-5 py-3 text-sm font-black text-slate-600">
                    File unavailable
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
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