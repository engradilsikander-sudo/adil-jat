// src/routes/programs/education/my-applications.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  FileText,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { useProgramTrackingCopy } from "../../../lib/program-tracking-i18n";
import {
  getEducationStatusClass,
  getEducationStatusLabel,
  type EducationApplicationDetails,
} from "../../../lib/programs/education";

export const Route = createFileRoute("/programs/education/my-applications")({
  component: MyEducationApplicationsPage,
});

type EducationApplication = {
  id: string;
  application_no: string | null;
  applicant_name: string;
  membership_no: string;
  district: string | null;
  taluka: string | null;
  details: EducationApplicationDetails | null;
  status: string;
  admin_remarks: string | null;
  approved_amount: number | null;
  created_at: string;
};

type DocumentSummary = {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  needs_reupload: number;
};

type DocumentSummaryMap = Record<string, DocumentSummary>;

const emptyDocumentSummary: DocumentSummary = {
  total: 0,
  pending: 0,
  verified: 0,
  rejected: 0,
  needs_reupload: 0,
};

function MyEducationApplicationsPage() {
  const { copy, arrowClass } = useProgramTrackingCopy("education");;
  const [items, setItems] = useState<EducationApplication[]>([]);
  const [documentSummary, setDocumentSummary] = useState<DocumentSummaryMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    void loadApplications();
  }, []);

  async function loadApplications(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Applications dekhne ke liye pehle login karen.");
      setItems([]);
      setDocumentSummary({});
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data, error } = await supabase
      .from("program_applications")
      .select(
        "id, application_no, applicant_name, membership_no, district, taluka, details, status, admin_remarks, approved_amount, created_at",
      )
      .eq("program_key", "education")
      .eq("applicant_user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<EducationApplication[]>();

    if (error) {
      setMessage(error.message);
      setItems([]);
      setDocumentSummary({});
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const rows = data ?? [];

    setItems(rows);

    await loadDocumentSummary(rows.map((item) => item.id));

    setLoading(false);
    setRefreshing(false);
  }

  async function loadDocumentSummary(applicationIds: string[]) {
    if (applicationIds.length === 0) {
      setDocumentSummary({});
      return;
    }

    const { data, error } = await supabase
      .from("program_documents")
      .select("application_id, verification_status")
      .in("application_id", applicationIds);

    if (error) {
      console.error("Education document summary failed:", error.message);
      setDocumentSummary({});
      return;
    }

    const nextSummary: DocumentSummaryMap = {};

    for (const applicationId of applicationIds) {
      nextSummary[applicationId] = { ...emptyDocumentSummary };
    }

    for (const document of data ?? []) {
      const applicationId = document.application_id;
      const status = document.verification_status;

      if (!nextSummary[applicationId]) {
        nextSummary[applicationId] = { ...emptyDocumentSummary };
      }

      nextSummary[applicationId].total += 1;

      if (status === "verified") {
        nextSummary[applicationId].verified += 1;
      } else if (status === "rejected") {
        nextSummary[applicationId].rejected += 1;
      } else if (status === "needs_reupload") {
        nextSummary[applicationId].needs_reupload += 1;
      } else {
        nextSummary[applicationId].pending += 1;
      }
    }

    setDocumentSummary(nextSummary);
  }

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) => {
      const details = item.details || {};

      return [
        item.application_no,
        item.applicant_name,
        item.membership_no,
        item.district,
        item.taluka,
        item.status,
        details.institute_name,
        details.class_degree,
        details.support_type,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [items, searchTerm]);

  return (
    <main className="min-h-screen bg-slate-50" dir="ltr">
      <section className="bg-slate-950 px-4 py-14 text-white md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-black md:text-6xl">
                {copy.program.listTitle}
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/75">
                Scholarship, fee support aur skills training applications ka
                status yahan track karen.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadApplications({ silent: true })}
              disabled={refreshing || loading}
              className="inline-flex w-fit items-center justify-center rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {refreshing ? copy.common.refreshing : copy.common.refresh}
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-16">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <div className="flex justify-center rounded-3xl border border-slate-200 bg-white p-12">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            </div>
          ) : message ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                Login Required
              </h2>
              <p className="mt-3 text-slate-600">{message}</p>

              <Link
                to="/login"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-950 px-6 py-3 font-black text-white no-underline"
              >
                Login
              </Link>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                No education applications yet
              </h2>

              <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                Aapne abhi tak education support ke liye application submit nahi
                ki.
              </p>

              <Link
                to="/programs/education/apply"
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-amber-400 px-6 py-3 font-black text-slate-950 no-underline"
              >
                Apply Now
                <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
              </Link>
            </div>
          ) : (
            <div className="grid gap-5">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-3xl font-black text-slate-950">
                    {copy.common.submitted} Applications
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Showing {filteredItems.length} of {items.length} records.
                  </p>
                </div>

                <Link
                  to="/programs/education/apply"
                  className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 no-underline"
                >
                  {copy.program.newApplication}
                  <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
                </Link>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search application no, name, membership no, institute, status..."
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-4 font-semibold outline-none transition focus:border-amber-500"
                />
              </div>

              {filteredItems.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <h2 className="text-2xl font-black text-slate-950">
                    No matching applications
                  </h2>
                  <p className="mt-3 text-slate-600">
                    Search text change kar ke dobara try karen.
                  </p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <ApplicationCard
                    key={item.id}
                    item={item}
                    summary={
                      documentSummary[item.id] || { ...emptyDocumentSummary }
                    }
                    viewDetailsLabel={copy.common.viewDetails}
                    arrowClass={arrowClass}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ApplicationCard({
  item,
  summary,
  viewDetailsLabel,
  arrowClass,
}: {
  item: EducationApplication;
  summary: DocumentSummary;
  viewDetailsLabel: string;
  arrowClass: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
              {item.application_no || "Application"}
            </span>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-black ${getEducationStatusClass(
                item.status,
              )}`}
            >
              {getEducationStatusLabel(item.status)}
            </span>

            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              <FileText className="mr-1 h-3.5 w-3.5" />
              {summary.total} Documents
            </span>
          </div>

          <h3 className="text-2xl font-black text-slate-950">
            {item.applicant_name}
          </h3>

          <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
            <p>
              <strong>Membership No:</strong> {item.membership_no}
            </p>
            <p>
              <strong>District/Taluka:</strong> {item.district || "-"} /{" "}
              {item.taluka || "-"}
            </p>
            <p>
              <strong>Institute:</strong>{" "}
              {item.details?.institute_name || "-"}
            </p>
            <p>
              <strong>Class/Degree:</strong>{" "}
              {item.details?.class_degree || "-"}
            </p>
            <p>
              <strong>Support Type:</strong>{" "}
              {item.details?.support_type || "-"}
            </p>
            <p>
              <strong>Required Amount:</strong>{" "}
              {item.details?.required_amount || "-"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              Verified: {summary.verified}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              Pending: {summary.pending}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
              Re-upload: {summary.needs_reupload}
            </span>
            <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">
              Rejected Docs: {summary.rejected}
            </span>
          </div>

          {item.admin_remarks ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <strong>Admin Remarks:</strong> {item.admin_remarks}
            </div>
          ) : null}
        </div>

        <div className="grid min-w-[190px] gap-3">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-black text-slate-950">
              {new Date(item.created_at).toLocaleDateString()}
            </p>

            {item.approved_amount ? (
              <p className="mt-2">
                Approved: <strong>Rs. {Number(item.approved_amount)}</strong>
              </p>
            ) : (
              <p className="mt-2">Approval pending</p>
            )}
          </div>

          <Link
  to="/programs/education/$id"
  params={{ id: item.id }}
  className="inline-flex items-center justify-center rounded-xl bg-emerald-900 px-5 py-3 text-sm font-black !text-white no-underline transition hover:bg-emerald-800 hover:!text-white"
  style={{ color: "#ffffff" }}
>
            {viewDetailsLabel}
            <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
          </Link>
        </div>
      </div>
    </article>
  );
}