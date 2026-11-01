// src/routes/admin/finance.tsx
import { Link, createFileRoute } from "@tanstack/react-router";
import { AdminShell } from '../../components/admin/AdminShell'
import {
  BadgeIndianRupee,
  Download,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../lib/supabase/client";
import {
  filterRowsByAreaAccess,
  getAreaAccessSummaryText,
  loadCurrentAdminAreaAccess,
} from "../../lib/area-permissions";
import {
  FINANCE_DOCUMENT_ACCEPT,
  FINANCE_DOCUMENT_BUCKET,
  buildDonationReceiptText,
  buildExpenseReceiptText,
  createFinanceDocumentStoragePath,
  financeExpenseCategoryOptions,
  financePaymentMethodOptions,
  financePurposeOptions,
  formatFinanceMoney,
  getExpenseCategoryLabel,
  getExpenseStatusLabel,
  getFinancePurposeLabel,
  getFinanceStatusClass,
  getFinanceStatusLabel,
  getPaymentMethodLabel,
  validateFinanceDocumentFile,
  type ExpenseCategory,
  type ExpenseStatus,
  type FinanceAuditLog,
  type FinanceDonation,
  type FinanceExpense,
  type FinancePaymentMethod,
  type FinancePurpose,
  type FinanceStatus,
} from "../../lib/finance";

import { useAdminManagementCopy } from '../../lib/admin-management-i18n'

export const Route = createFileRoute("/admin/finance")({
  component: FinanceAdminPage,
});

type DonationForm = {
  donorName: string;
  donorPhone: string;
  amount: string;
  paymentMethod: FinancePaymentMethod;
  receiptNo: string;
  purpose: FinancePurpose;
  district: string;
  taluka: string;
  notes: string;
};

type LinkedProgramKey = "education" | "health" | "welfare" | "";

type ExpenseForm = {
  expenseTitle: string;
  amount: string;
  category: ExpenseCategory;
  linkedProgramKey: string;
  linkedApplicationId: string;
  paymentMethod: FinancePaymentMethod;
  paidTo: string;
  district: string;
  taluka: string;
  receiptNo: string;
  notes: string;
};

type AccessState =
  | { ok: true; userId: string }
  | { ok: false; message: string };

const initialDonationForm: DonationForm = {
  donorName: "",
  donorPhone: "",
  amount: "",
  paymentMethod: "cash",
  receiptNo: "",
  purpose: "general_fund",
  district: "",
  taluka: "",
  notes: "",
};

const initialExpenseForm: ExpenseForm = {
  expenseTitle: "",
  amount: "",
  category: "general",
  linkedProgramKey: "",
  linkedApplicationId: "",
  paymentMethod: "cash",
  paidTo: "",
  district: "",
  taluka: "",
  receiptNo: "",
  notes: "",
};

const statusFilterOptions = ["all", "pending", "approved", "rejected", "paid"];
const monthFilterOptions = ["all", "this_month", "last_month", "this_year"];

function FinanceAdminPage() {
  const { copy } = useAdminManagementCopy('finance')
  const [donations, setDonations] = useState<FinanceDonation[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [auditLogs, setAuditLogs] = useState<FinanceAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [areaNotice, setAreaNotice] = useState("");
  const [success, setSuccess] = useState("");
  const [activePanel, setActivePanel] = useState<
    "dashboard" | "donations" | "expenses" | "audit"
  >("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [purposeFilter, setPurposeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [donationForm, setDonationForm] =
    useState<DonationForm>(initialDonationForm);
  const [expenseForm, setExpenseForm] =
    useState<ExpenseForm>(initialExpenseForm);
  const [expenseFile, setExpenseFile] = useState<File | null>(null);

  useEffect(() => {
    void loadFinanceData();
  }, []);

  async function loadFinanceData() {
    setLoading(true);
    setMessage("");
    setSuccess("");
    setAreaNotice("");

    const access = await ensureFinanceAdminAccess();

    if (!access.ok) {
      setMessage(access.message);
      setDonations([]);
      setExpenses([]);
      setAuditLogs([]);
      setLoading(false);
      return;
    }


    const areaAccess = await loadCurrentAdminAreaAccess("finance", "view", {
      requiredRoles: ["admin", "super_admin", "finance_admin"],
    });

    if (!areaAccess.ok) {
      setMessage(areaAccess.message);
      setDonations([]);
      setExpenses([]);
      setAuditLogs([]);
      setLoading(false);
      return;
    }

    const [donationResult, expenseResult, auditResult] = await Promise.all([
      supabase
        .from("finance_donations")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<FinanceDonation[]>(),
      supabase
        .from("finance_expenses")
        .select("*")
        .order("created_at", { ascending: false })
        .returns<FinanceExpense[]>(),
      supabase
        .from("finance_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30)
        .returns<FinanceAuditLog[]>(),
    ]);

    if (donationResult.error || expenseResult.error || auditResult.error) {
      setMessage(
        donationResult.error?.message ||
          expenseResult.error?.message ||
          auditResult.error?.message ||
          "Unable to load finance records.",
      );
      setLoading(false);
      return;
    }

    setDonations(filterRowsByAreaAccess(donationResult.data || [], areaAccess));
    setExpenses(filterRowsByAreaAccess(expenseResult.data || [], areaAccess));
    setAuditLogs(auditResult.data || []);
    setAreaNotice(getAreaAccessSummaryText(areaAccess));
    setLoading(false);
  }

  const districtOptions = useMemo(() => {
    return getUniqueOptions([
      ...donations.map((item) => item.district),
      ...expenses.map((item) => item.district),
    ]);
  }, [donations, expenses]);

  const filteredDonations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return donations.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || statusFilter === "paid"
          ? statusFilter === "all"
          : item.status === statusFilter;
      const matchesPurpose =
        purposeFilter === "all" || item.purpose === purposeFilter;
      const matchesDistrict =
        districtFilter === "all" ||
        normalizeValue(item.district) === districtFilter;
      const matchesMonth = matchesMonthFilter(item.created_at, monthFilter);
      const matchesSearch = q
        ? [
            item.donation_no,
            item.donor_name,
            item.donor_phone,
            item.receipt_no,
            item.purpose,
            item.district,
            item.taluka,
            item.notes,
            item.donor_member_no_snapshot,
            item.donor_father_name_snapshot,
            item.transaction_reference,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q))
        : true;

      return (
        matchesStatus &&
        matchesPurpose &&
        matchesDistrict &&
        matchesMonth &&
        matchesSearch
      );
    });
  }, [
    districtFilter,
    donations,
    monthFilter,
    purposeFilter,
    searchTerm,
    statusFilter,
  ]);

  const filteredExpenses = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return expenses.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchesDistrict =
        districtFilter === "all" ||
        normalizeValue(item.district) === districtFilter;
      const matchesMonth = matchesMonthFilter(item.created_at, monthFilter);
      const matchesSearch = q
        ? [
            item.expense_title,
            item.paid_to,
            item.receipt_no,
            item.category,
            item.linked_program_key,
            item.district,
            item.taluka,
            item.notes,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q))
        : true;

      return (
        matchesStatus &&
        matchesCategory &&
        matchesDistrict &&
        matchesMonth &&
        matchesSearch
      );
    });
  }, [
    categoryFilter,
    districtFilter,
    expenses,
    monthFilter,
    searchTerm,
    statusFilter,
  ]);

  const dashboard = useMemo(() => {
    const approvedDonations = donations.filter(
      (item) => item.status === "approved",
    );
    const paidOrApprovedExpenses = expenses.filter((item) =>
      ["approved", "paid"].includes(item.status),
    );
    const totalDonations = sumAmounts(approvedDonations);
    const totalExpenses = sumAmounts(paidOrApprovedExpenses);
    const pendingDonations = donations.filter(
      (item) => item.status === "pending",
    ).length;
    const pendingExpenses = expenses.filter(
      (item) => item.status === "pending",
    ).length;

    const programSpending = groupAmountBy(
      paidOrApprovedExpenses,
      (item) => item.linked_program_key || item.category || "general",
    );
    const districtSpending = groupAmountBy(
      paidOrApprovedExpenses,
      (item) => item.district || "Not Set",
    );
    const monthlyDonations = sumAmounts(
      approvedDonations.filter((item) =>
        matchesMonthFilter(item.created_at, "this_month"),
      ),
    );
    const monthlyExpenses = sumAmounts(
      paidOrApprovedExpenses.filter((item) =>
        matchesMonthFilter(item.created_at, "this_month"),
      ),
    );

    return {
      totalDonations,
      totalExpenses,
      balance: totalDonations - totalExpenses,
      pendingDonations,
      pendingExpenses,
      programSpending,
      districtSpending,
      monthlyDonations,
      monthlyExpenses,
    };
  }, [donations, expenses]);

  async function submitDonation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setSuccess("");

    const access = await ensureFinanceAdminAccess();
    if (!access.ok) {
      setMessage(access.message);
      setSaving(false);
      return;
    }

    const amount = Number(donationForm.amount);
    if (
      !donationForm.donorName.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setMessage("Donor name aur valid amount required hain.");
      setSaving(false);
      return;
    }

    const payload = {
      donor_name: donationForm.donorName.trim(),
      donor_phone: donationForm.donorPhone.trim() || null,
      amount,
      payment_method: donationForm.paymentMethod,
      receipt_no: donationForm.receiptNo.trim() || null,
      purpose: donationForm.purpose,
      district: donationForm.district.trim() || null,
      taluka: donationForm.taluka.trim() || null,
      notes: donationForm.notes.trim() || null,
      status: "pending" as FinanceStatus,
      created_by: access.userId,
    };

    const { data, error } = await supabase
      .from("finance_donations")
      .insert(payload)
      .select("*")
      .single()
      .returns<FinanceDonation>();

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    await writeAuditLog(
      access.userId,
      "created_donation",
      "finance_donations",
      data.id,
      null,
      data,
    );
    setDonationForm(initialDonationForm);
    setSuccess("Donation record saved for finance approval.");
    setSaving(false);
    await loadFinanceData();
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setSuccess("");

    const access = await ensureFinanceAdminAccess();
    if (!access.ok) {
      setMessage(access.message);
      setSaving(false);
      return;
    }

    const amount = Number(expenseForm.amount);
    if (
      !expenseForm.expenseTitle.trim() ||
      !expenseForm.paidTo.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setMessage("Expense title, paid to aur valid amount required hain.");
      setSaving(false);
      return;
    }

    let documentPath: string | null = null;

    if (expenseFile) {
      const fileError = validateFinanceDocumentFile(expenseFile);
      if (fileError) {
        setMessage(fileError);
        setSaving(false);
        return;
      }

      documentPath = createFinanceDocumentStoragePath({
        userId: access.userId,
        folder: "expenses",
        fileName: expenseFile.name,
      });

      const { error: uploadError } = await supabase.storage
        .from(FINANCE_DOCUMENT_BUCKET)
        .upload(documentPath, expenseFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: expenseFile.type,
        });

      if (uploadError) {
        setMessage(uploadError.message);
        setSaving(false);
        return;
      }
    }

    const payload = {
      expense_title: expenseForm.expenseTitle.trim(),
      amount,
      category: expenseForm.category,
      linked_program_key: (expenseForm.linkedProgramKey || null) as Exclude<
        LinkedProgramKey,
        ""
      > | null,
      linked_application_id: expenseForm.linkedApplicationId.trim() || null,
      payment_method: expenseForm.paymentMethod,
      paid_to: expenseForm.paidTo.trim(),
      district: expenseForm.district.trim() || null,
      taluka: expenseForm.taluka.trim() || null,
      receipt_no: expenseForm.receiptNo.trim() || null,
      document_path: documentPath,
      notes: expenseForm.notes.trim() || null,
      status: "pending" as ExpenseStatus,
      created_by: access.userId,
    };

    const { data, error } = await supabase
      .from("finance_expenses")
      .insert(payload)
      .select("*")
      .single()
      .returns<FinanceExpense>();

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    await writeAuditLog(
      access.userId,
      "created_expense",
      "finance_expenses",
      data.id,
      null,
      data,
    );
    setExpenseForm(initialExpenseForm);
    setExpenseFile(null);
    setSuccess("Expense record saved for finance approval.");
    setSaving(false);
    await loadFinanceData();
  }

  async function updateDonationStatus(
    donation: FinanceDonation,
    status: FinanceStatus,
  ) {
    await updateFinanceRecord({
      entityType: "finance_donations",
      id: donation.id,
      oldData: donation,
      status,
      action: status === "approved" ? "approved_donation" : "rejected_donation",
    });
  }

  async function updateExpenseStatus(
    expense: FinanceExpense,
    status: ExpenseStatus,
  ) {
    await updateFinanceRecord({
      entityType: "finance_expenses",
      id: expense.id,
      oldData: expense,
      status,
      action:
        status === "paid"
          ? "marked_expense_paid"
          : status === "approved"
            ? "approved_expense"
            : "rejected_expense",
    });
  }

  async function updateFinanceRecord({
    entityType,
    id,
    oldData,
    status,
    action,
  }: {
    entityType: "finance_donations" | "finance_expenses";
    id: string;
    oldData: FinanceDonation | FinanceExpense;
    status: FinanceStatus | ExpenseStatus;
    action: string;
  }) {
    setMessage("");
    setSuccess("");
    const access = await ensureFinanceAdminAccess();

    if (!access.ok) {
      setMessage(access.message);
      return;
    }

    const patch: Record<string, unknown> = { status };

    if (status === "approved") {
      patch.approved_by = access.userId;
      patch.approved_at = new Date().toISOString();
      patch.rejected_by = null;
      patch.rejected_at = null;
    }

    if (status === "rejected") {
      patch.rejected_by = access.userId;
      patch.rejected_at = new Date().toISOString();
    }

    if (status === "paid") {
      patch.paid_by = access.userId;
      patch.paid_at = new Date().toISOString();
    }

    const query = supabase
      .from(entityType)
      .update(patch as never)
      .eq("id", id)
      .select("*")
      .single();
    const { data, error } = await query;

    if (error) {
      setMessage(error.message);
      return;
    }

    await writeAuditLog(access.userId, action, entityType, id, oldData, data);
    setSuccess("Finance record updated and audit log saved.");
    await loadFinanceData();
  }

  async function openFinanceDocument(path: string) {
    const { data, error } = await supabase.storage
      .from(FINANCE_DOCUMENT_BUCKET)
      .createSignedUrl(path, 60 * 10);

    if (error || !data?.signedUrl) {
      setMessage(error?.message || "Unable to open document.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setPurposeFilter("all");
    setCategoryFilter("all");
    setDistrictFilter("all");
    setMonthFilter("all");
  }

  return (
    <AdminShell title="Finance" subtitle="Track donations, expenses, receipts, approvals and finance audit logs.">
      <div className="admin-nested-page">
      <section className="bg-slate-950 px-4 py-12 text-white md:py-16">
        <div className="mx-auto max-w-7xl">
          <Link
            to="/admin"
            className="inline-flex items-center text-sm font-bold text-amber-300 no-underline hover:text-amber-200"
          >
            {copy.common.backToAdmin}
          </Link>

          <div className="mt-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
                <BadgeIndianRupee className="h-4 w-4 text-amber-300" /> {copy.page.badge}
              </div>

              <h1 className="mt-5 text-4xl font-black md:text-6xl">
                Donation / Fund / Finance
              </h1>

              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70">
                Internal donation and expense tracking with approval workflow,
                restricted finance access, audit logs, receipt records and
                reports.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <button
                type="button"
                onClick={() =>
                  exportFinanceCsv(filteredDonations, filteredExpenses)
                }
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 font-black text-white transition hover:bg-white/20 disabled:opacity-60"
              >
                <Download className="mr-2 h-4 w-4" /> {copy.common.exportCsv}
              </button>
              <button
                type="button"
                onClick={loadFinanceData}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}{" "}
                {copy.common.refresh}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-14">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-900 shadow-sm">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-none" />
              <div>
                <h2 className="font-black">
                  Finance privacy and audit warning
                </h2>
                <p className="mt-1 text-sm leading-6">
                  Ye module sensitive hai. Sirf finance/admin roles ko access
                  den. Approved ya paid records edit karne ke bajaye new
                  correction entry aur audit note rakhen.
                </p>
              </div>
            </div>
          </div>

          {message ? <Alert tone="error" message={message} /> : null}
          {success ? <Alert tone="success" message={success} /> : null}

    
      {areaNotice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800">
          {areaNotice}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Total Donations"
              value={formatFinanceMoney(dashboard.totalDonations)}
              icon={<BadgeIndianRupee className="h-5 w-5" />}
            />
            <StatCard
              title={copy.page.totalExpenses}
              value={formatFinanceMoney(dashboard.totalExpenses)}
              icon={<FileText className="h-5 w-5" />}
            />
            <StatCard
              title="Available Balance"
              value={formatFinanceMoney(dashboard.balance)}
              icon={<ShieldCheck className="h-5 w-5" />}
            />
            <StatCard
              title="Pending Review"
              value={dashboard.pendingDonations + dashboard.pendingExpenses}
              icon={<Filter className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {(["dashboard", "donations", "expenses", "audit"] as const).map(
              (panel) => (
                <button
                  key={panel}
                  type="button"
                  onClick={() => setActivePanel(panel)}
                  className={`rounded-2xl px-4 py-3 text-sm font-black transition ${activePanel === panel ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {panel === "dashboard"
                    ? "Dashboard"
                    : panel === "donations"
                      ? "Donations"
                      : panel === "expenses"
                        ? "Expenses"
                        : copy.page.auditLog}
                </button>
              ),
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-[1fr_170px_170px_170px_170px_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={copy.page.searchPlaceholder}
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-4 font-semibold outline-none transition focus:border-amber-500"
                />
              </label>
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusFilterOptions.map((value) => ({
                  value,
                  label:
                    value === "all"
                      ? "All Status"
                      : value === "paid"
                        ? "Paid"
                        : getFinanceStatusLabel(value),
                }))}
              />
              <Select
                value={purposeFilter}
                onChange={setPurposeFilter}
                options={[
                  { value: "all", label: "All Purposes" },
                  ...financePurposeOptions,
                ]}
              />
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { value: "all", label: "All Categories" },
                  ...financeExpenseCategoryOptions,
                ]}
              />
              <Select
                value={districtFilter}
                onChange={setDistrictFilter}
                options={[
                  { value: "all", label: "All Districts" },
                  ...districtOptions,
                ]}
              />
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 font-black text-slate-700 transition hover:bg-slate-50"
              >
                <XCircle className="mr-2 h-4 w-4" /> Reset
              </button>
            </div>
            <div className="mt-4 max-w-xs">
              <Select
                value={monthFilter}
                onChange={setMonthFilter}
                options={monthFilterOptions.map((value) => ({
                  value,
                  label:
                    value === "all"
                      ? "All Months"
                      : value === "this_month"
                        ? "This Month"
                        : value === "last_month"
                          ? "Last Month"
                          : "This Year",
                }))}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center rounded-3xl border border-slate-200 bg-white p-12 shadow-sm">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            </div>
          ) : activePanel === "dashboard" ? (
            <DashboardPanel
              dashboard={dashboard}
              donations={donations}
              expenses={expenses}
            />
          ) : activePanel === "donations" ? (
            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <DonationFormPanel
                form={donationForm}
                saving={saving}
                onChange={setDonationForm}
                onSubmit={submitDonation}
              />
              <DonationList
                items={filteredDonations}
                onApprove={(item) =>
                  void updateDonationStatus(item, "approved")
                }
                onReject={(item) => void updateDonationStatus(item, "rejected")}
                onOpenReceipt={(path) => void openFinanceDocument(path)}
              />
            </div>
          ) : activePanel === "expenses" ? (
            <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
              <ExpenseFormPanel
                form={expenseForm}
                file={expenseFile}
                saving={saving}
                onChange={setExpenseForm}
                onFileChange={setExpenseFile}
                onSubmit={submitExpense}
              />
              <ExpenseList
                items={filteredExpenses}
                onApprove={(item) => void updateExpenseStatus(item, "approved")}
                onReject={(item) => void updateExpenseStatus(item, "rejected")}
                onPaid={(item) => void updateExpenseStatus(item, "paid")}
                onOpenDocument={(path) => void openFinanceDocument(path)}
              />
            </div>
          ) : (
            <AuditLogPanel items={auditLogs} />
          )}
        </div>
      </section>
    </div>
    </AdminShell>
  );
}

function DonationFormPanel({
  form,
  saving,
  onChange,
  onSubmit,
}: {
  form: DonationForm;
  saving: boolean;
  onChange: (form: DonationForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-xl font-black text-slate-950">Add Donation</h2>
      <div className="mt-5 grid gap-4">
        <Input
          label="Donor Name"
          value={form.donorName}
          onChange={(value) => onChange({ ...form, donorName: value })}
          required
        />
        <Input
          label="Donor Phone"
          value={form.donorPhone}
          onChange={(value) => onChange({ ...form, donorPhone: value })}
        />
        <Input
          label="Amount"
          type="number"
          value={form.amount}
          onChange={(value) => onChange({ ...form, amount: value })}
          required
        />
        <Select
          label="Payment Method"
          value={form.paymentMethod}
          onChange={(value) =>
            onChange({ ...form, paymentMethod: value as FinancePaymentMethod })
          }
          options={financePaymentMethodOptions}
        />
        <Input
          label="Receipt No"
          value={form.receiptNo}
          onChange={(value) => onChange({ ...form, receiptNo: value })}
        />
        <Select
          label="Purpose"
          value={form.purpose}
          onChange={(value) =>
            onChange({ ...form, purpose: value as FinancePurpose })
          }
          options={financePurposeOptions}
        />
        <Input
          label="District"
          value={form.district}
          onChange={(value) => onChange({ ...form, district: value })}
        />
        <Input
          label="Taluka"
          value={form.taluka}
          onChange={(value) => onChange({ ...form, taluka: value })}
        />
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(value) => onChange({ ...form, notes: value })}
        />
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-900 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}{" "}
          Save Donation
        </button>
      </div>
    </form>
  );
}

function ExpenseFormPanel({
  form,
  file,
  saving,
  onChange,
  onFileChange,
  onSubmit,
}: {
  form: ExpenseForm;
  file: File | null;
  saving: boolean;
  onChange: (form: ExpenseForm) => void;
  onFileChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0] || null);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-xl font-black text-slate-950">Add Expense</h2>
      <div className="mt-5 grid gap-4">
        <Input
          label="Expense Title"
          value={form.expenseTitle}
          onChange={(value) => onChange({ ...form, expenseTitle: value })}
          required
        />
        <Input
          label="Amount"
          type="number"
          value={form.amount}
          onChange={(value) => onChange({ ...form, amount: value })}
          required
        />
        <Select
          label="Category"
          value={form.category}
          onChange={(value) =>
            onChange({ ...form, category: value as ExpenseCategory })
          }
          options={financeExpenseCategoryOptions}
        />
        <Select
          label="Linked Program"
          value={form.linkedProgramKey}
          onChange={(value) => onChange({ ...form, linkedProgramKey: value })}
          options={[
            { value: "", label: "Not Linked" },
            { value: "education", label: "Education" },
            { value: "health", label: "Health" },
            { value: "welfare", label: "Welfare" },
          ]}
        />
        <Input
          label="Linked Case/Application ID"
          value={form.linkedApplicationId}
          onChange={(value) =>
            onChange({ ...form, linkedApplicationId: value })
          }
        />
        <Input
          label="Paid To"
          value={form.paidTo}
          onChange={(value) => onChange({ ...form, paidTo: value })}
          required
        />
        <Select
          label="Payment Method"
          value={form.paymentMethod}
          onChange={(value) =>
            onChange({ ...form, paymentMethod: value as FinancePaymentMethod })
          }
          options={financePaymentMethodOptions}
        />
        <Input
          label="Receipt No"
          value={form.receiptNo}
          onChange={(value) => onChange({ ...form, receiptNo: value })}
        />
        <Input
          label="District"
          value={form.district}
          onChange={(value) => onChange({ ...form, district: value })}
        />
        <Input
          label="Taluka"
          value={form.taluka}
          onChange={(value) => onChange({ ...form, taluka: value })}
        />
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(value) => onChange({ ...form, notes: value })}
        />
        <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          <span className="inline-flex items-center gap-2">
            <Upload className="h-4 w-4" /> Receipt / Document Upload
          </span>
          <input
            type="file"
            accept={FINANCE_DOCUMENT_ACCEPT}
            onChange={handleFile}
            className="mt-3 block w-full text-sm"
          />
          {file ? (
            <span className="mt-2 block text-xs text-slate-500">
              Selected: {file.name}
            </span>
          ) : null}
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-900 disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}{" "}
          Save Expense
        </button>
      </div>
    </form>
  );
}

function DashboardPanel({
  dashboard,
  donations,
  expenses,
}: {
  dashboard: ReturnType<typeof buildDashboardLike>;
  donations: FinanceDonation[];
  expenses: FinanceExpense[];
}) {
  const programRows = dashboard.programSpending.slice(0, 6);
  const districtRows = dashboard.districtSpending.slice(0, 6);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">Monthly Report</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <MiniReport
            label="This Month Donations"
            value={formatFinanceMoney(dashboard.monthlyDonations)}
          />
          <MiniReport
            label="This Month Expenses"
            value={formatFinanceMoney(dashboard.monthlyExpenses)}
          />
          <MiniReport label="Donation Records" value={donations.length} />
          <MiniReport label="Expense Records" value={expenses.length} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">
          Program-wise Spending
        </h2>
        <ReportRows rows={programRows} empty="No program spending yet." />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
        <h2 className="text-xl font-black text-slate-950">
          District-wise Spending
        </h2>
        <ReportRows rows={districtRows} empty="No district spending yet." />
      </section>
    </div>
  );
}

function DonationList({
  items,
  onApprove,
  onReject,
  onOpenReceipt,
}: {
  items: FinanceDonation[];
  onApprove: (item: FinanceDonation) => void;
  onReject: (item: FinanceDonation) => void;
  onOpenReceipt: (path: string) => void;
}) {
  if (!items.length) return <EmptyPanel title="No donation records found" />;

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <DonationCard
          key={item.id}
          item={item}
          onApprove={onApprove}
          onReject={onReject}
          onOpenReceipt={onOpenReceipt}
        />
      ))}
    </div>
  );
}

function DonationCard({
  item,
  onApprove,
  onReject,
  onOpenReceipt,
}: {
  item: FinanceDonation;
  onApprove: (item: FinanceDonation) => void;
  onReject: (item: FinanceDonation) => void;
  onOpenReceipt: (path: string) => void;
}) {
  const donorMemberNo = item.donor_member_no_snapshot || "Manual donation";
  const donorFather = item.donor_father_name_snapshot || null;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{item.donation_no || item.receipt_no || "Donation"}</Badge>
            <StatusBadge
              status={item.status}
              label={getFinanceStatusLabel(item.status)}
            />
            <Badge>{getFinancePurposeLabel(item.purpose)}</Badge>
            {item.donor_member_id ? <Badge>Leaderboard Eligible</Badge> : null}
          </div>
          <h3 className="mt-3 text-xl font-black text-slate-950">
            {item.donor_name}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {item.donor_phone || "No phone"} •{" "}
            {getPaymentMethodLabel(item.payment_method)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Member ID: {donorMemberNo}
            {donorFather ? ` • Father: ${donorFather}` : ""}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {item.district || "-"} / {item.taluka || "-"}
          </p>
          {item.transaction_reference ? (
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Reference: {item.transaction_reference}
            </p>
          ) : null}
          {item.notes ? (
            <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
              {item.notes}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2 md:min-w-[190px] md:text-right">
          <p className="text-2xl font-black text-slate-950">
            {formatFinanceMoney(item.amount)}
          </p>
          <p className="text-xs font-semibold text-slate-500">
            {new Date(item.created_at).toLocaleDateString()}
          </p>
          <ActionButtons
            status={item.status}
            onApprove={() => onApprove(item)}
            onReject={() => onReject(item)}
          />
          {item.receipt_file_path ? (
            <button
              type="button"
              onClick={() => onOpenReceipt(item.receipt_file_path!)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> Proof
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `donation-${item.receipt_no || item.donation_no || item.id}.txt`,
                buildDonationReceiptText(item),
              )
            }
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="mr-2 h-3.5 w-3.5" /> Receipt
          </button>
        </div>
      </div>
    </article>
  );
}

function ExpenseList({
  items,
  onApprove,
  onReject,
  onPaid,
  onOpenDocument,
}: {
  items: FinanceExpense[];
  onApprove: (item: FinanceExpense) => void;
  onReject: (item: FinanceExpense) => void;
  onPaid: (item: FinanceExpense) => void;
  onOpenDocument: (path: string) => void;
}) {
  if (!items.length) return <EmptyPanel title="No expense records found" />;

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <ExpenseCard
          key={item.id}
          item={item}
          onApprove={onApprove}
          onReject={onReject}
          onPaid={onPaid}
          onOpenDocument={onOpenDocument}
        />
      ))}
    </div>
  );
}

function ExpenseCard({
  item,
  onApprove,
  onReject,
  onPaid,
  onOpenDocument,
}: {
  item: FinanceExpense;
  onApprove: (item: FinanceExpense) => void;
  onReject: (item: FinanceExpense) => void;
  onPaid: (item: FinanceExpense) => void;
  onOpenDocument: (path: string) => void;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{item.receipt_no || "Expense"}</Badge>
            <StatusBadge
              status={item.status}
              label={getExpenseStatusLabel(item.status)}
            />
            <Badge>{getExpenseCategoryLabel(item.category)}</Badge>
          </div>
          <h3 className="mt-3 text-xl font-black text-slate-950">
            {item.expense_title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Paid to: {item.paid_to} •{" "}
            {getPaymentMethodLabel(item.payment_method)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Linked: {item.linked_program_key || "-"} • {item.district || "-"} /{" "}
            {item.taluka || "-"}
          </p>
          {item.notes ? (
            <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
              {item.notes}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2 md:min-w-[190px] md:text-right">
          <p className="text-2xl font-black text-slate-950">
            {formatFinanceMoney(item.amount)}
          </p>
          <p className="text-xs font-semibold text-slate-500">
            {new Date(item.created_at).toLocaleDateString()}
          </p>
          <ActionButtons
            status={item.status}
            onApprove={() => onApprove(item)}
            onReject={() => onReject(item)}
            onPaid={() => onPaid(item)}
          />
          {item.document_path ? (
            <button
              type="button"
              onClick={() => onOpenDocument(item.document_path!)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              <FileText className="mr-2 h-3.5 w-3.5" /> Document
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `expense-${item.receipt_no || item.id}.txt`,
                buildExpenseReceiptText(item),
              )
            }
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="mr-2 h-3.5 w-3.5" /> Receipt
          </button>
        </div>
      </div>
    </article>
  );
}

function ActionButtons({
  status,
  onApprove,
  onReject,
  onPaid,
}: {
  status: string;
  onApprove: () => void;
  onReject: () => void;
  onPaid?: () => void;
}) {
  return (
    <div className="grid gap-2">
      {status === "pending" ? (
        <>
          <button
            type="button"
            onClick={onApprove}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-800"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white transition hover:bg-red-700"
          >
            Reject
          </button>
        </>
      ) : null}
      {status === "approved" && onPaid ? (
        <button
          type="button"
          onClick={onPaid}
          className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
        >
          Mark Paid
        </button>
      ) : null}
    </div>
  );
}

function AuditLogPanel({ items }: { items: FinanceAuditLog[] }) {
  const { copy } = useAdminManagementCopy('finance')
  if (!items.length) return <EmptyPanel title={copy.page.noAuditLogs} />;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-950">Recent {copy.page.auditLog}s</h2>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
          >
            <p className="text-sm font-black text-slate-900">
              {item.action.replace(/_/g, " ")}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {item.entity_type} • {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        {icon}
      </div>
      <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const field = (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
  if (!label) return field;
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
      </span>
      {field}
    </label>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
      {children}
    </span>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${getFinanceStatusClass(status)}`}
    >
      {label}
    </span>
  );
}

function Alert({
  tone,
  message,
}: {
  tone: "error" | "success";
  message: string;
}) {
  return (
    <div
      className={`rounded-3xl border p-4 text-sm font-semibold shadow-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
    >
      {message}
    </div>
  );
}

function EmptyPanel({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm">
      <p className="text-xl font-black text-slate-950">{title}</p>
    </div>
  );
}

function MiniReport({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function ReportRows({
  rows,
  empty,
}: {
  rows: Array<{ label: string; amount: number }>;
  empty: string;
}) {
  if (!rows.length)
    return <p className="mt-4 text-sm text-slate-500">{empty}</p>;
  return (
    <div className="mt-5 grid gap-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
        >
          <span className="font-bold text-slate-700">{row.label}</span>
          <span className="font-black text-slate-950">
            {formatFinanceMoney(row.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

async function ensureFinanceAdminAccess(): Promise<AccessState> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "Finance module dekhne ke liye pehle login karen.",
    };
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["admin", "super_admin", "finance_admin"]);

  if (error || !data?.length) {
    return {
      ok: false,
      message:
        "Finance module sirf admin, super admin ya finance admin ke liye allowed hai.",
    };
  }

  return { ok: true, userId: user.id };
}

async function writeAuditLog(
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldData: unknown,
  newData: unknown,
) {
  await supabase.from("finance_audit_logs").insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_data: oldData as never,
    new_data: newData as never,
  });
}

function getUniqueOptions(values: Array<string | null>) {
  const map = new Map<string, string>();
  for (const value of values) {
    const label = value?.trim();
    if (!label) continue;
    const normalized = normalizeValue(label);
    if (!map.has(normalized)) map.set(normalized, label);
  }
  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function normalizeValue(value?: string | null) {
  return value?.trim().toLowerCase() || "";
}

function matchesMonthFilter(dateText: string, filter: string) {
  if (filter === "all") return true;
  const date = new Date(dateText);
  const now = new Date();
  if (filter === "this_year") return date.getFullYear() === now.getFullYear();
  if (filter === "this_month")
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  if (filter === "last_month") {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return (
      date.getFullYear() === lastMonth.getFullYear() &&
      date.getMonth() === lastMonth.getMonth()
    );
  }
  return true;
}

function sumAmounts(items: Array<{ amount: number }>) {
  return items.reduce((total, item) => total + Number(item.amount || 0), 0);
}

function groupAmountBy<T extends { amount: number }>(
  items: T[],
  getLabel: (item: T) => string,
) {
  const map = new Map<string, number>();
  for (const item of items) {
    const label = getLabel(item) || "Not Set";
    map.set(label, (map.get(label) || 0) + Number(item.amount || 0));
  }
  return Array.from(map.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function buildDashboardLike() {
  return {
    totalDonations: 0,
    totalExpenses: 0,
    balance: 0,
    pendingDonations: 0,
    pendingExpenses: 0,
    programSpending: [] as Array<{ label: string; amount: number }>,
    districtSpending: [] as Array<{ label: string; amount: number }>,
    monthlyDonations: 0,
    monthlyExpenses: 0,
  };
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportFinanceCsv(
  donations: FinanceDonation[],
  expenses: FinanceExpense[],
) {
  const headers = [
    "type",
    "status",
    "donation_no",
    "member_id",
    "father_name",
    "title_or_name",
    "amount",
    "method",
    "purpose_or_category",
    "district",
    "taluka",
    "transaction_reference",
    "receipt_no",
    "date",
  ];
  const rows = [
    ...donations.map((item) => [
      "donation",
      item.status,
      item.donation_no || "",
      item.donor_member_no_snapshot || "",
      item.donor_father_name_snapshot || "",
      item.donor_name,
      item.amount,
      getPaymentMethodLabel(item.payment_method),
      getFinancePurposeLabel(item.purpose),
      item.district || "",
      item.taluka || "",
      item.transaction_reference || "",
      item.receipt_no || "",
      item.created_at,
    ]),
    ...expenses.map((item) => [
      "expense",
      item.status,
      "",
      "",
      "",
      item.expense_title,
      item.amount,
      getPaymentMethodLabel(item.payment_method),
      getExpenseCategoryLabel(item.category),
      item.district || "",
      item.taluka || "",
      "",
      item.receipt_no || "",
      item.created_at,
    ]),
  ];
  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `jas-finance-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string | number) {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
