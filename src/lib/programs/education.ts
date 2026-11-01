import { localizedProgramLabel, type ProgramLabelMap } from "../program-status-i18n";

export type EducationStatus =
  | "submitted"
  | "under_review"
  | "need_more_info"
  | "approved"
  | "rejected"
  | "paid_completed"
  | "completed";

export type MemberRelationship =
  | "self"
  | "son"
  | "daughter"
  | "father"
  | "mother"
  | "brother"
  | "sister"
  | "wife"
  | "husband"
  | "guardian"
  | "other";

export type EducationDocumentType =
  | "student_cnic_bform"
  | "guardian_cnic"
  | "marksheet"
  | "admission_proof"
  | "fee_challan"
  | "institute_card"
  | "other";

export type EducationDocumentVerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "needs_reupload";

export type VerifyMembershipResult = {
  valid: boolean;
  reason?: string;
  member_id?: string;
  membership_no?: string;
  full_name?: string;
  district?: string;
  taluka?: string;
  status?: string;
};

export type EducationApplicationDetails = {
  guardian_name?: string;
  institute_name?: string;
  institute_type?: string;
  class_degree?: string;
  board_university?: string;
  academic_year?: string;
  last_exam?: string;
  total_marks?: string;
  obtained_marks?: string;
  percentage?: string;
  support_type?: string;
  required_amount?: string;
  reason?: string;
};

export type EducationDocumentConfig = {
  type: EducationDocumentType;
  label: string;
  description: string;
  required: boolean;
};

export type EducationDocumentRecord = {
  id: string;
  application_id: string;
  program_key: "education";
  uploaded_by: string;
  document_type: EducationDocumentType | string;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  verification_status: EducationDocumentVerificationStatus | string;
  is_verified: boolean;
  admin_note: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export const EDUCATION_DOCUMENT_BUCKET = "program-documents";

export const EDUCATION_MAX_DOCUMENT_SIZE_MB = 5;

export const EDUCATION_MAX_DOCUMENT_SIZE_BYTES =
  EDUCATION_MAX_DOCUMENT_SIZE_MB * 1024 * 1024;

export const EDUCATION_DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";

export const EDUCATION_ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const relationshipOptions: Array<{
  value: MemberRelationship;
  label: string;
}> = [
  { value: "self", label: "Self" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "wife", label: "Wife" },
  { value: "husband", label: "Husband" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" },
];

export const instituteTypeOptions = [
  "School",
  "College",
  "University",
  "Madrasa",
  "Technical Institute",
  "Other",
];

export const supportTypeOptions = [
  "Admission Fee",
  "Monthly Fee",
  "Exam Fee",
  "Books",
  "Uniform",
  "Hostel",
  "Transport",
  "Full Scholarship",
  "Skills Training",
  "Other",
];

export const educationDocumentOptions: EducationDocumentConfig[] = [
  {
    type: "student_cnic_bform",
    label: "Student CNIC / B-form",
    description: "Upload student CNIC or B-form copy.",
    required: true,
  },
  {
    type: "guardian_cnic",
    label: "Guardian CNIC",
    description: "Upload father / guardian CNIC copy.",
    required: true,
  },
  {
    type: "marksheet",
    label: "Latest Marksheet",
    description: "Upload latest marksheet or result card.",
    required: true,
  },
  {
    type: "admission_proof",
    label: "Admission Proof",
    description: "Upload admission letter, enrollment proof or institute slip.",
    required: true,
  },
  {
    type: "fee_challan",
    label: "Fee Challan",
    description: "Upload current fee challan or fee demand slip.",
    required: true,
  },
  {
    type: "institute_card",
    label: "Institute Card / Enrollment Proof",
    description: "Upload student card or enrollment proof if available.",
    required: false,
  },
  {
    type: "other",
    label: "Other Supporting Document",
    description: "Upload any other supporting document if needed.",
    required: false,
  },
];

export const educationRequiredDocumentTypes = educationDocumentOptions
  .filter((item) => item.required)
  .map((item) => item.type);

export const educationStatusLabels: Record<EducationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  need_more_info: "Need More Info",
  approved: "Approved",
  rejected: "Rejected",
  paid_completed: "Paid / Completed",
  completed: "Completed",
};

export const educationDocumentStatusLabels: Record<
  EducationDocumentVerificationStatus,
  string
> = {
  pending: "Pending Verification",
  verified: "Verified",
  rejected: "Rejected",
  needs_reupload: "Needs Re-upload",
};

const educationStatusLabelTranslations: Record<EducationStatus, ProgramLabelMap> = {
  submitted: { en: "Submitted", ur: "جمع شدہ", sd: "جمع ٿيل" },
  under_review: { en: "Under Review", ur: "زیر جائزہ", sd: "جائزي هيٺ" },
  need_more_info: { en: "Need More Info", ur: "مزید معلومات درکار", sd: "وڌيڪ معلومات گهربل" },
  approved: { en: "Approved", ur: "منظور شدہ", sd: "منظور ٿيل" },
  rejected: { en: "Rejected", ur: "مسترد", sd: "رد ٿيل" },
  paid_completed: { en: "Paid / Completed", ur: "ادائیگی مکمل", sd: "ادائيگي مڪمل" },
  completed: { en: "Completed", ur: "مکمل", sd: "مڪمل" },
};

const educationDocumentStatusLabelTranslations: Record<
  EducationDocumentVerificationStatus,
  ProgramLabelMap
> = {
  pending: { en: "Pending Verification", ur: "تصدیق باقی", sd: "تصديق باقي" },
  verified: { en: "Verified", ur: "تصدیق شدہ", sd: "تصديق ٿيل" },
  rejected: { en: "Rejected", ur: "مسترد", sd: "رد ٿيل" },
  needs_reupload: { en: "Needs Re-upload", ur: "دوبارہ اپلوڈ درکار", sd: "ٻيهر اپلوڊ گهربل" },
};

const educationDocumentLabelTranslations: Record<EducationDocumentType, ProgramLabelMap> = {
  student_cnic_bform: { en: "Student CNIC / B-form", ur: "طالب علم CNIC / ب فارم", sd: "شاگرد جو CNIC / ب فارم" },
  guardian_cnic: { en: "Guardian CNIC", ur: "سرپرست CNIC", sd: "سرپرست CNIC" },
  marksheet: { en: "Marksheet", ur: "مارک شیٹ", sd: "مارڪ شيٽ" },
  admission_proof: { en: "Admission Proof", ur: "داخلہ ثبوت", sd: "داخلا ثبوت" },
  fee_challan: { en: "Fee Challan", ur: "فیس چالان", sd: "في چالان" },
  institute_card: { en: "Institute Card", ur: "ادارہ کارڈ", sd: "اداري جو ڪارڊ" },
  other: { en: "Other Supporting Document", ur: "دیگر معاون دستاویز", sd: "ٻيو مددگار دستاويز" },
};


export function getEducationStatusLabel(status: string) {
  const typedStatus = status as EducationStatus

  return localizedProgramLabel(
    educationStatusLabelTranslations[typedStatus],
    educationStatusLabels[typedStatus] ?? status,
  )
}

export function getEducationStatusClass(status: string) {
  switch (status) {
    case "approved":
    case "paid_completed":
    case "completed":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "need_more_info":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "under_review":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

export function getEducationDocumentConfig(type: string) {
  return educationDocumentOptions.find((item) => item.type === type);
}

export function getEducationDocumentLabel(type: string) {
  const typedType = type as EducationDocumentType
  const fallback = getEducationDocumentConfig(type)?.label ?? type

  return localizedProgramLabel(educationDocumentLabelTranslations[typedType], fallback)
}

export function getEducationDocumentStatusLabel(status: string) {
  const typedStatus = status as EducationDocumentVerificationStatus

  return localizedProgramLabel(
    educationDocumentStatusLabelTranslations[typedStatus],
    educationDocumentStatusLabels[typedStatus] ?? status,
  )
}

export function getEducationDocumentStatusClass(status: string) {
  switch (status) {
    case "verified":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "needs_reupload":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

export function formatEducationFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "Unknown size";

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(2)} MB`;
}

export function validateEducationDocumentFile(file: File) {
  if (file.size > EDUCATION_MAX_DOCUMENT_SIZE_BYTES) {
    return {
      ok: false,
      message: `File size ${EDUCATION_MAX_DOCUMENT_SIZE_MB}MB se zyada nahi honi chahiye.`,
    };
  }

  if (
    file.type &&
    !EDUCATION_ALLOWED_DOCUMENT_MIME_TYPES.includes(
      file.type as (typeof EDUCATION_ALLOWED_DOCUMENT_MIME_TYPES)[number],
    )
  ) {
    return {
      ok: false,
      message: "Only PDF, JPG, PNG ya WEBP documents allowed hain.",
    };
  }

  return { ok: true, message: "" };
}

export function createEducationDocumentStoragePath({
  userId,
  applicationId,
  documentType,
  fileName,
}: {
  userId: string;
  applicationId: string;
  documentType: EducationDocumentType;
  fileName: string;
}) {
  const extension = getSafeFileExtension(fileName);
  const random = Math.random().toString(36).slice(2, 10);

  return `${userId}/${applicationId}/${documentType}-${Date.now()}-${random}.${extension}`;
}

function getSafeFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase().trim();

  if (extension && /^[a-z0-9]+$/.test(extension)) {
    return extension;
  }

  return "bin";
}