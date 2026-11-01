export type FinanceStatus = "pending" | "approved" | "rejected";
export type ExpenseStatus = FinanceStatus | "paid";

export type FinancePaymentMethod =
  | "cash"
  | "bank"
  | "jazzcash"
  | "easypaisa"
  | "manual_transfer";

export type FinancePurpose =
  | "education"
  | "health"
  | "welfare"
  | "general_fund";

export type ExpenseCategory =
  | "education"
  | "health"
  | "welfare"
  | "office"
  | "program"
  | "transport"
  | "general";

export type FinanceDonation = {
  id: string;
  donation_no: string | null;
  donor_user_id: string | null;
  donor_member_id: string | null;
  donor_member_no_snapshot: string | null;
  donor_name_snapshot: string | null;
  donor_father_name_snapshot: string | null;
  donor_district_snapshot: string | null;
  donor_taluka_snapshot: string | null;
  transaction_reference: string | null;
  receipt_file_path: string | null;
  donor_name: string;
  donor_phone: string | null;
  amount: number;
  payment_method: FinancePaymentMethod | string;
  receipt_no: string | null;
  purpose: FinancePurpose | string;
  district: string | null;
  taluka: string | null;
  notes: string | null;
  status: FinanceStatus | string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceExpense = {
  id: string;
  expense_title: string;
  amount: number;
  category: ExpenseCategory | string;
  linked_program_key: string | null;
  linked_application_id: string | null;
  payment_method: FinancePaymentMethod | string;
  paid_to: string;
  district: string | null;
  taluka: string | null;
  receipt_no: string | null;
  document_path: string | null;
  notes: string | null;
  status: ExpenseStatus | string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  paid_by: string | null;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceAuditLog = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: unknown | null;
  new_data: unknown | null;
  created_at: string;
};

export const FINANCE_DOCUMENT_BUCKET = "finance-documents";
export const FINANCE_MAX_DOCUMENT_SIZE_MB = 8;
export const FINANCE_MAX_DOCUMENT_SIZE_BYTES =
  FINANCE_MAX_DOCUMENT_SIZE_MB * 1024 * 1024;
export const FINANCE_DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";
export const FINANCE_ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const financePaymentMethodOptions: Array<{
  value: FinancePaymentMethod;
  label: string;
}> = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "Easypaisa" },
  { value: "manual_transfer", label: "Manual Transfer" },
];

export const financePurposeOptions: Array<{
  value: FinancePurpose;
  label: string;
}> = [
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "welfare", label: "Welfare" },
  { value: "general_fund", label: "General Fund" },
];

export const financeExpenseCategoryOptions: Array<{
  value: ExpenseCategory;
  label: string;
}> = [
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "welfare", label: "Welfare" },
  { value: "office", label: "Office / Admin" },
  { value: "program", label: "Program Expense" },
  { value: "transport", label: "Transport" },
  { value: "general", label: "General" },
];

export const financeStatusOptions: Array<{
  value: FinanceStatus;
  label: string;
}> = [
  { value: "pending", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export const expenseStatusOptions: Array<{
  value: ExpenseStatus;
  label: string;
}> = [
  { value: "pending", label: "Pending Approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
];

export function getFinanceStatusLabel(status?: string | null) {
  if (!status) return "Pending Approval";
  return (
    financeStatusOptions.find((item) => item.value === status)?.label ||
    titleCase(status)
  );
}

export function getExpenseStatusLabel(status?: string | null) {
  if (!status) return "Pending Approval";
  return (
    expenseStatusOptions.find((item) => item.value === status)?.label ||
    titleCase(status)
  );
}

export function getPaymentMethodLabel(method?: string | null) {
  if (!method) return "-";
  return (
    financePaymentMethodOptions.find((item) => item.value === method)?.label ||
    titleCase(method)
  );
}

export function getFinancePurposeLabel(purpose?: string | null) {
  if (!purpose) return "-";
  return (
    financePurposeOptions.find((item) => item.value === purpose)?.label ||
    titleCase(purpose)
  );
}

export function getExpenseCategoryLabel(category?: string | null) {
  if (!category) return "-";
  return (
    financeExpenseCategoryOptions.find((item) => item.value === category)
      ?.label || titleCase(category)
  );
}

export function getFinanceStatusClass(status?: string | null) {
  switch (status) {
    case "approved":
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "rejected":
      return "border-red-200 bg-red-50 text-red-800";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800";
  }
}

export function formatFinanceMoney(value?: number | string | null) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function createFinanceDocumentStoragePath({
  userId,
  folder,
  fileName,
}: {
  userId: string;
  folder: "donations" | "expenses";
  fileName: string;
}) {
  const safeName = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);

  return `${userId}/${folder}/${Date.now()}-${safeName || "receipt"}`;
}

export function validateFinanceDocumentFile(file: File) {
  if (!FINANCE_ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as never)) {
    return "Only PDF, JPG, PNG or WEBP receipt/document files are allowed.";
  }

  if (file.size > FINANCE_MAX_DOCUMENT_SIZE_BYTES) {
    return `File size ${FINANCE_MAX_DOCUMENT_SIZE_MB}MB se kam honi chahiye.`;
  }

  return "";
}

export function formatFinanceFileSize(bytes?: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildDonationReceiptText(donation: FinanceDonation) {
  return [
    "Jatt Alliance Sindh (JAS)",
    "Donation Receipt",
    "----------------------------------------",
    `Donation ID: ${donation.donation_no || donation.id}`,
    `Receipt No: ${donation.receipt_no || "-"}`,
    `Donor Name: ${donation.donor_name_snapshot || donation.donor_name}`,
    `Father Name: ${donation.donor_father_name_snapshot || "-"}`,
    `Member ID: ${donation.donor_member_no_snapshot || "-"}`,
    `Phone: ${donation.donor_phone || "-"}`,
    `Amount: ${formatFinanceMoney(donation.amount)}`,
    `Payment Method: ${getPaymentMethodLabel(donation.payment_method)}`,
    `Transaction Reference: ${donation.transaction_reference || "-"}`,
    `Purpose: ${getFinancePurposeLabel(donation.purpose)}`,
    `District/Taluka: ${donation.district || "-"} / ${donation.taluka || "-"}`,
    `Status: ${getFinanceStatusLabel(donation.status)}`,
    `Date: ${new Date(donation.created_at).toLocaleString()}`,
    "----------------------------------------",
    "This is a system-generated internal receipt record.",
  ].join("\n");
}

export function buildExpenseReceiptText(expense: FinanceExpense) {
  return [
    "Jatt Alliance Sindh (JAS)",
    "Expense / Payment Record",
    "----------------------------------------",
    `Receipt No: ${expense.receipt_no || expense.id}`,
    `Expense Title: ${expense.expense_title}`,
    `Paid To: ${expense.paid_to}`,
    `Amount: ${formatFinanceMoney(expense.amount)}`,
    `Category: ${getExpenseCategoryLabel(expense.category)}`,
    `Payment Method: ${getPaymentMethodLabel(expense.payment_method)}`,
    `District/Taluka: ${expense.district || "-"} / ${expense.taluka || "-"}`,
    `Status: ${getExpenseStatusLabel(expense.status)}`,
    `Date: ${new Date(expense.created_at).toLocaleString()}`,
    "----------------------------------------",
    "This is a system-generated internal expense record.",
  ].join("\n");
}

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
