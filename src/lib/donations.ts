import {
  FINANCE_ALLOWED_DOCUMENT_MIME_TYPES,
  FINANCE_DOCUMENT_ACCEPT,
  FINANCE_DOCUMENT_BUCKET,
  FINANCE_MAX_DOCUMENT_SIZE_BYTES,
  FINANCE_MAX_DOCUMENT_SIZE_MB,
  createFinanceDocumentStoragePath,
  financePaymentMethodOptions,
  financePurposeOptions,
  formatFinanceMoney,
  getFinancePurposeLabel,
  getPaymentMethodLabel,
  validateFinanceDocumentFile,
  type FinancePaymentMethod,
  type FinancePurpose,
} from "./finance";

export type ApprovedMemberForDonation = {
  id: string;
  user_id: string;
  member_no: string | null;
  full_name: string;
  father_name: string;
  mobile: string;
  district: string;
  taluka: string | null;
  status: string;
};

export type DonationLeaderboardRow = {
  donor_member_id: string;
  donor_name: string;
  donor_father_name: string;
  donor_member_no: string;
  donor_district: string | null;
  donor_taluka: string | null;
  total_donated: number;
  donation_count: number;
  purposes: string[];
  first_approved_at: string | null;
  latest_approved_at: string | null;
};

export type DonationPurpose = FinancePurpose;
export type DonationPaymentMethod = FinancePaymentMethod;

export {
  FINANCE_ALLOWED_DOCUMENT_MIME_TYPES as DONATION_ALLOWED_DOCUMENT_MIME_TYPES,
  FINANCE_DOCUMENT_ACCEPT as DONATION_RECEIPT_ACCEPT,
  FINANCE_DOCUMENT_BUCKET as DONATION_DOCUMENT_BUCKET,
  FINANCE_MAX_DOCUMENT_SIZE_BYTES as DONATION_MAX_RECEIPT_SIZE_BYTES,
  FINANCE_MAX_DOCUMENT_SIZE_MB as DONATION_MAX_RECEIPT_SIZE_MB,
  createFinanceDocumentStoragePath as createDonationReceiptStoragePath,
  financePaymentMethodOptions as donationPaymentMethodOptions,
  financePurposeOptions as donationPurposeOptions,
  formatFinanceMoney as formatDonationMoney,
  getFinancePurposeLabel as getDonationPurposeLabel,
  getPaymentMethodLabel as getDonationPaymentMethodLabel,
  validateFinanceDocumentFile as validateDonationReceiptFile,
};

export function formatLeaderboardPurposes(purposes?: string[] | null) {
  if (!purposes?.length) return "General Fund";
  return purposes.map((purpose) => getFinancePurposeLabel(purpose)).join(" + ");
}

export function getDonorBadge(total: number) {
  if (total >= 100000) return "Diamond Supporter";
  if (total >= 50000) return "Platinum Supporter";
  if (total >= 25000) return "Gold Supporter";
  if (total >= 10000) return "Silver Supporter";
  if (total >= 5000) return "Bronze Supporter";
  return "Community Supporter";
}

export function getRankLabel(rank: number) {
  if (rank === 1) return "Top Donor";
  if (rank === 2) return "Major Supporter";
  if (rank === 3) return "Community Champion";
  return "JAS Supporter";
}

export function buildDonationReferenceHint(memberNo?: string | null) {
  return memberNo
    ? `${memberNo} / donation reference`
    : "membership no / donation reference";
}
