import { MEMBERSHIP_RECEIPT_BUCKET, type MembershipPayment } from "./membership-fee";
import { supabase } from "./supabase/client";
import {
  isPakistaniMobile,
  normalizeMobile,
  todayDate,
} from "./shared/formatters";
import type {
  CommitteeMemberRecord,
  CommitteeRecord,
  CommitteeStatus,
  DesignationRecord,
  MemberSearchResult,
} from "./committees";

export type MemberStatus = "pending" | "approved" | "rejected";

export type Member = {
  id: string;
  user_id: string;
  member_no: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender: string | null;
  education: string | null;
  blood_group: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relation: string | null;
  emergency_contact_mobile: string | null;
  declaration_accepted: boolean;
  full_name: string;
  father_name: string;
  cnic: string;
  mobile: string;
  district: string;
  taluka: string | null;
  profession: string | null;
  caste_branch: string | null;
  photo_url: string | null;
  status: MemberStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  created_at: string;
};

export type AdminEditFormState = {
  fullName: string;
  fatherName: string;
  cnic: string;
  mobile: string;
  district: string;
  taluka: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  education: string;
  bloodGroup: string;
  profession: string;
  casteBranch: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactMobile: string;
  declarationAccepted: boolean;
};

export type AdminEditField = keyof AdminEditFormState | "photo";

export type AdminEditErrors = Partial<Record<AdminEditField, string>>;

export type OfficeBearerIssueForm = {
  committeeId: string;
  designationId: string;
  designationTitle: string;
  status: CommitteeStatus;
  sortOrder: string;
  tenureStart: string;
  tenureEnd: string;
  appointmentNotes: string;
};

export type AdminOfficeBearerAssignment = CommitteeMemberRecord & {
  committee: CommitteeRecord | null;
};

export type DesignationAssignmentLevel =
  | "central-executive"
  | "central-advisory"
  | "provincial"
  | "divisional"
  | "district"
  | "taluka";

export const designationAssignmentLevelOptions: Array<{
  value: DesignationAssignmentLevel;
  label: string;
}> = [
  { value: "central-executive", label: "Central Executive Committee" },
  { value: "central-advisory", label: "Central Advisory Committee" },
  { value: "provincial", label: "Provincial" },
  { value: "divisional", label: "Divisional" },
  { value: "district", label: "District" },
  { value: "taluka", label: "Taluka" },
];

export type DesignationDropdownOption = {
  value: string;
  label: string;
  source: "recommended" | "configured";
  designationId?: string;
};

export const recommendedDesignationsByLevel: Record<
  DesignationAssignmentLevel,
  string[]
> = {
  "central-executive": [
    "Chairman",
    "Senior Vice Chairman",
    "Vice Chairman",
    "General Secretary",
    "Information Secretary",
    "Finance Secretary",
    "Joint Secretary",
    "Deputy General Secretary",
    "Office Secretary",
    "Media Coordinator",
  ],
  "central-advisory": [
    "Chief Patron",
    "Patron",
    "Senior Advisor",
    "Advisor",
    "Legal Advisor",
    "Media Advisor",
    "Policy Advisor",
    "Advisory Board Member",
  ],
  provincial: [
    "Provincial President",
    "Provincial Senior Vice President",
    "Provincial Vice President",
    "Provincial General Secretary",
    "Provincial Information Secretary",
    "Provincial Finance Secretary",
    "Provincial Joint Secretary",
    "Provincial Coordinator",
  ],
  divisional: [
    "Divisional President",
    "Divisional Senior Vice President",
    "Divisional Vice President",
    "Divisional General Secretary",
    "Divisional Information Secretary",
    "Divisional Finance Secretary",
    "Divisional Joint Secretary",
    "Divisional Coordinator",
  ],
  district: [
    "District President",
    "District Senior Vice President",
    "District Vice President",
    "District General Secretary",
    "District Information Secretary",
    "District Finance Secretary",
    "District Joint Secretary",
    "District Coordinator",
  ],
  taluka: [
    "Taluka President",
    "Taluka Senior Vice President",
    "Taluka Vice President",
    "Taluka General Secretary",
    "Taluka Information Secretary",
    "Taluka Finance Secretary",
    "Taluka Joint Secretary",
    "Taluka Coordinator",
  ],
};

export type AdminAccessResult =
  | { ok: true }
  | { ok: false; redirectTo: "/login" | "/dashboard" };

export const MEMBER_PHOTO_BUCKET = "member-photos";
export const MEMBER_PHOTO_MAX_SIZE_BYTES = 2 * 1024 * 1024;
export const MEMBER_PHOTO_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const SIGNED_URL_TTL_SECONDS = 60 * 60;
export const RECEIPT_SIGNED_URL_TTL_SECONDS = 60 * 60;
export const MIN_REJECTION_REASON_LENGTH = 10;
export const MEMBERSHIP_REVIEW_ROLES: Array<
  "admin" | "super_admin" | "membership_admin"
> = ["admin", "super_admin", "membership_admin"];

export const initialOfficeBearerIssueForm: OfficeBearerIssueForm = {
  committeeId: "",
  designationId: "",
  designationTitle: "",
  status: "active",
  sortOrder: "10",
  tenureStart: todayDate(),
  tenureEnd: "",
  appointmentNotes: "",
};

export const MEMBER_SELECT_COLUMNS = [
  "id",
  "user_id",
  "member_no",
  "address",
  "date_of_birth",
  "gender",
  "education",
  "blood_group",
  "emergency_contact_name",
  "emergency_contact_relation",
  "emergency_contact_mobile",
  "declaration_accepted",
  "full_name",
  "father_name",
  "cnic",
  "mobile",
  "district",
  "taluka",
  "profession",
  "caste_branch",
  "photo_url",
  "status",
  "rejection_reason",
  "reviewed_at",
  "approved_at",
  "created_at",
].join(", ");

function normalizeDesignationLevelText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function sameTextValue(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  const left = normalizeDesignationLevelText(a);
  const right = normalizeDesignationLevelText(b);

  return Boolean(left && right && left === right);
}

function scoreCommitteeForMember(committee: CommitteeRecord, member: Member) {
  let score = 0;

  if (sameTextValue(committee.district, member.district)) score += 4;
  if (sameTextValue(committee.taluka, member.taluka)) score += 6;

  return score;
}

function isCentralExecutiveCommittee(committee: CommitteeRecord) {
  const name = normalizeDesignationLevelText(committee.name);

  return (
    committee.committee_type === "central" &&
    (name.includes("central executive") ||
      name.includes("central working") ||
      name.includes("cwc") ||
      name.includes("cec") ||
      name.includes("markaz"))
  );
}

function isCentralAdvisoryCommittee(committee: CommitteeRecord) {
  const name = normalizeDesignationLevelText(committee.name);

  return (
    committee.committee_type === "central_advisory" ||
    (committee.committee_type === "central" &&
      (name.includes("central advisory") ||
        name.includes("advisory committee") ||
        name.includes("advisory board") ||
        name.includes("advisor")))
  );
}

function isProvincialCommittee(committee: CommitteeRecord) {
  const name = normalizeDesignationLevelText(committee.name);

  return (
    committee.committee_type === "provincial" ||
    (committee.committee_type === "central" &&
      (name.includes("provincial") ||
        name.includes("province") ||
        name.includes("sindh")))
  );
}

function pickBestCommittee(candidates: CommitteeRecord[], member: Member) {
  return (
    [...candidates].sort((a, b) => {
      const scoreDifference =
        scoreCommitteeForMember(b, member) - scoreCommitteeForMember(a, member);

      if (scoreDifference !== 0) return scoreDifference;

      return a.name.localeCompare(b.name);
    })[0] ?? null
  );
}

export function findCommitteeForDesignationLevel(
  level: DesignationAssignmentLevel,
  activeCommittees: CommitteeRecord[],
  member: Member,
) {
  if (!level) return null;

  if (level === "central-executive") {
    const centralExecutive = activeCommittees.filter(
      isCentralExecutiveCommittee,
    );
    return pickBestCommittee(centralExecutive, member);
  }

  if (level === "central-advisory") {
    const centralAdvisory = activeCommittees.filter(isCentralAdvisoryCommittee);
    return pickBestCommittee(centralAdvisory, member);
  }

  if (level === "provincial") {
    const provincial = activeCommittees.filter(isProvincialCommittee);
    return pickBestCommittee(provincial, member);
  }

  if (level === "divisional") {
    return pickBestCommittee(
      activeCommittees.filter(
        (committee) => committee.committee_type === "divisional",
      ),
      member,
    );
  }

  if (level === "district") {
    return pickBestCommittee(
      activeCommittees.filter(
        (committee) => committee.committee_type === "district",
      ),
      member,
    );
  }

  return pickBestCommittee(
    activeCommittees.filter(
      (committee) => committee.committee_type === "taluka",
    ),
    member,
  );
}

export function getSelectedDesignationLevel(
  selectedCommittee: CommitteeRecord | null,
  activeCommittees: CommitteeRecord[],
  member: Member,
): DesignationAssignmentLevel | "" {
  if (!selectedCommittee) return "";

  const matchedLevel = designationAssignmentLevelOptions.find((level) => {
    const committee = findCommitteeForDesignationLevel(
      level.value,
      activeCommittees,
      member,
    );
    return committee?.id === selectedCommittee.id;
  });

  return matchedLevel?.value ?? "";
}

export function getRecommendedDesignationOptions(
  level: DesignationAssignmentLevel | "",
) {
  if (!level) return [];

  return recommendedDesignationsByLevel[level].map((title) => ({
    value: `recommended:${level}:${title}`,
    label: title,
    source: "recommended" as const,
  }));
}

export function getConfiguredDesignationOptions(designations: DesignationRecord[]) {
  return designations
    .filter((designation) => designation.is_active)
    .map((designation) => ({
      value: `configured:${designation.id}`,
      label: designation.title,
      source: "configured" as const,
      designationId: designation.id,
    }));
}

export function getDesignationDropdownOptions(
  level: DesignationAssignmentLevel | "",
  designations: DesignationRecord[],
): DesignationDropdownOption[] {
  const optionMap = new Map<string, DesignationDropdownOption>();

  for (const option of getRecommendedDesignationOptions(level)) {
    optionMap.set(option.label.toLowerCase(), option);
  }

  for (const option of getConfiguredDesignationOptions(designations)) {
    const key = option.label.toLowerCase();

    if (!optionMap.has(key)) {
      optionMap.set(key, option);
    }
  }

  return Array.from(optionMap.values());
}

export async function ensureAdminAccess(): Promise<AdminAccessResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, redirectTo: "/login" };
  }

  const { data: roles, error: roleError } = await supabase
    .from("user_roles")
    .select("id, role")
    .eq("user_id", user.id)
    .in("role", MEMBERSHIP_REVIEW_ROLES)
    .limit(1);

  if (roleError || !roles?.length) {
    return { ok: false, redirectTo: "/dashboard" };
  }

  return { ok: true };
}

export async function getAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("Unable to get access token.");
  }

  return session.access_token;
}

export async function createSignedPhotoUrl(photoPath: string | null) {
  if (!photoPath) return null;

  const { data, error } = await supabase.storage
    .from(MEMBER_PHOTO_BUCKET)
    .createSignedUrl(photoPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;

  return data.signedUrl;
}

export async function createSignedReceiptUrl(receiptPath: string | null | undefined) {
  if (!receiptPath) return null;

  const { data, error } = await supabase.storage
    .from(MEMBERSHIP_RECEIPT_BUCKET)
    .createSignedUrl(receiptPath, RECEIPT_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;

  return data.signedUrl;
}

async function fetchMembershipPaymentByMemberId(memberId: string) {
  const { data, error } = await supabase
    .from("membership_payments")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
    .returns<MembershipPayment | null>();

  if (error) throw error;

  return data;
}

export async function fetchMembershipPaymentWithReceiptUrl(memberId: string): Promise<{
  payment: MembershipPayment | null;
  receiptSignedUrl: string | null;
  errorMessage?: string;
}> {
  try {
    const payment = await fetchMembershipPaymentByMemberId(memberId);
    const receiptSignedUrl = await createSignedReceiptUrl(
      payment?.receipt_path,
    );

    return {
      payment,
      receiptSignedUrl,
      errorMessage:
        payment?.receipt_path && !receiptSignedUrl
          ? "Receipt file not available."
          : undefined,
    };
  } catch (err) {
    return {
      payment: null,
      receiptSignedUrl: null,
      errorMessage:
        err instanceof Error
          ? `Payment record could not be loaded: ${err.message}`
          : "Payment record could not be loaded.",
    };
  }
}

export async function fetchOfficeBearerAssignments(memberId: string) {
  const { data, error } = await supabase
    .from("organization_committee_members" as never)
    .select(
      [
        "id",
        "committee_id",
        "member_id",
        "designation_id",
        "designation_title",
        "status",
        "sort_order",
        "tenure_start",
        "tenure_end",
        "appointment_notes",
        "member_no_snapshot",
        "full_name_snapshot",
        "father_name_snapshot",
        "district_snapshot",
        "taluka_snapshot",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("member_id" as never, memberId as never)
    .order("status", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;

  const assignments = (data ?? []) as unknown as CommitteeMemberRecord[];
  const committeeIds = Array.from(
    new Set(assignments.map((item) => item.committee_id)),
  );

  if (!committeeIds.length) return [];

  const { data: committeeData, error: committeeError } = await supabase
    .from("organization_committees" as never)
    .select(
      [
        "id",
        "committee_type",
        "name",
        "division",
        "district",
        "taluka",
        "tenure_start",
        "tenure_end",
        "status",
        "public_display",
        "notes",
        "created_by",
        "updated_by",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .in("id" as never, committeeIds as never);

  if (committeeError) throw committeeError;

  const committeeMap = new Map(
    ((committeeData ?? []) as unknown as CommitteeRecord[]).map((committee) => [
      committee.id,
      committee,
    ]),
  );

  return assignments.map((assignment) => ({
    ...assignment,
    committee: committeeMap.get(assignment.committee_id) ?? null,
  }));
}

export function memberToCommitteeSearchResult(member: Member): MemberSearchResult {
  return {
    id: member.id,
    full_name: member.full_name,
    father_name: member.father_name,
    member_no: member.member_no,
    district: member.district,
    taluka: member.taluka,
    mobile: member.mobile,
    status: member.status,
  };
}

export async function fetchMemberById(id: string) {
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;

  return data as Member | null;
}

export function memberToAdminEditForm(member: Member): AdminEditFormState {
  return {
    fullName: member.full_name,
    fatherName: member.father_name,
    cnic: member.cnic,
    mobile: member.mobile,
    district: member.district,
    taluka: member.taluka ?? "",
    address: member.address ?? "",
    dateOfBirth: member.date_of_birth ?? "",
    gender: member.gender ?? "",
    education: member.education ?? "",
    bloodGroup: member.blood_group ?? "",
    profession: member.profession ?? "",
    casteBranch: member.caste_branch ?? "",
    emergencyContactName: member.emergency_contact_name ?? "",
    emergencyContactRelation: member.emergency_contact_relation ?? "",
    emergencyContactMobile: member.emergency_contact_mobile ?? "",
    declarationAccepted: member.declaration_accepted,
  };
}

export function validateAdminEditForm(form: AdminEditFormState) {
  const errors: AdminEditErrors = {};
  const normalizedMobile = normalizeMobile(form.mobile);
  const normalizedEmergencyMobile = normalizeMobile(
    form.emergencyContactMobile,
  );

  if (!form.fullName.trim() || form.fullName.trim().length < 3) {
    errors.fullName = "Full name must be at least 3 characters.";
  }

  if (!form.fatherName.trim() || form.fatherName.trim().length < 3) {
    errors.fatherName = "Father name must be at least 3 characters.";
  }

  if (!/^[0-9]{5}-[0-9]{7}-[0-9]$/.test(form.cnic.trim())) {
    errors.cnic = "CNIC must use 12345-1234567-1 format.";
  }

  if (!isPakistaniMobile(normalizedMobile)) {
    errors.mobile = "Enter a valid Pakistani mobile number.";
  }

  if (!form.district.trim()) {
    errors.district = "District is required.";
  }

  if (!form.taluka.trim()) {
    errors.taluka = "Taluka is required.";
  }

  if (!form.address.trim() || form.address.trim().length < 10) {
    errors.address = "Address must be at least 10 characters.";
  }

  if (form.dateOfBirth && form.dateOfBirth > todayDate()) {
    errors.dateOfBirth = "Date of birth cannot be in the future.";
  }

  if (
    normalizedEmergencyMobile &&
    !isPakistaniMobile(normalizedEmergencyMobile)
  ) {
    errors.emergencyContactMobile = "Enter a valid emergency mobile number.";
  }

  if (!form.declarationAccepted) {
    errors.declarationAccepted =
      "Declaration must be accepted before approval.";
  }

  return errors;
}

export function getStatusLabel(
  status: MemberStatus,
  copy?: { status: Record<MemberStatus, string> },
) {
  switch (status) {
    case "approved":
      return copy?.status.approved ?? "Approved";
    case "rejected":
      return copy?.status.rejected ?? "Rejected";
    default:
      return copy?.status.pending ?? "Pending";
  }
}

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return withTime
    ? date.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function formatCnic(value: string | null | undefined) {
  if (!value) return "N/A";

  const digits = value.replace(/\D/g, "");

  if (digits.length === 13) {
    return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
  }

  return value;
}

export function formatMobile(value: string | null | undefined) {
  if (!value) return "N/A";

  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("92") && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return digits;
  }

  if (digits.startsWith("3") && digits.length === 10) {
    return `0${digits}`;
  }

  return value;
}

export function formatPaymentMethod(payment: MembershipPayment) {
  return prettifyPaymentValue(payment.payment_method);
}

export function formatGatewayProvider(payment: MembershipPayment) {
  const provider = payment.gateway_provider || payment.payment_method;

  return prettifyPaymentValue(provider);
}

function prettifyPaymentValue(value: string | null | undefined) {
  if (!value) return null;

  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
