// src/routes/programs/education/apply.tsx
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { useProgramApplyCopy } from "../../../lib/program-apply-i18n";
import {
  EDUCATION_DOCUMENT_ACCEPT,
  EDUCATION_DOCUMENT_BUCKET,
  createEducationDocumentStoragePath,
  educationDocumentOptions,
  educationRequiredDocumentTypes,
  formatEducationFileSize,
  instituteTypeOptions,
  relationshipOptions,
  supportTypeOptions,
  validateEducationDocumentFile,
  type EducationDocumentType,
  type MemberRelationship,
  type VerifyMembershipResult,
} from "../../../lib/programs/education";

export const Route = createFileRoute("/programs/education/apply")({
  component: EducationApplyPage,
});

type EducationFormState = {
  membershipNo: string;
  relationshipToMember: MemberRelationship;

  studentName: string;
  guardianName: string;
  studentCnic: string;
  phone: string;
  email: string;
  district: string;
  taluka: string;
  address: string;

  instituteName: string;
  instituteType: string;
  classDegree: string;
  boardUniversity: string;
  academicYear: string;

  lastExam: string;
  totalMarks: string;
  obtainedMarks: string;
  percentage: string;

  supportType: string;
  requiredAmount: string;
  reason: string;
};

type DocumentFileState = Partial<Record<EducationDocumentType, File | null>>;

const initialForm: EducationFormState = {
  membershipNo: "",
  relationshipToMember: "self",

  studentName: "",
  guardianName: "",
  studentCnic: "",
  phone: "",
  email: "",
  district: "",
  taluka: "",
  address: "",

  instituteName: "",
  instituteType: "School",
  classDegree: "",
  boardUniversity: "",
  academicYear: "",

  lastExam: "",
  totalMarks: "",
  obtainedMarks: "",
  percentage: "",

  supportType: "Admission Fee",
  requiredAmount: "",
  reason: "",
};

function EducationApplyPage() {
  const navigate = useNavigate();
  const { copy, textDir, textAlignClass, arrowClass, iconBeforeClass } = useProgramApplyCopy("education");

  const [form, setForm] = useState<EducationFormState>(initialForm);
  const [documentFiles, setDocumentFiles] = useState<DocumentFileState>({});
  const [verifiedMember, setVerifiedMember] =
    useState<VerifyMembershipResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  function updateField<K extends keyof EducationFormState>(
    key: K,
    value: EducationFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateDocumentFile(
    documentType: EducationDocumentType,
    file: File | null,
  ) {
    setDocumentFiles((prev) => ({
      ...prev,
      [documentType]: file,
    }));
  }

  function handleDocumentChange(
    documentType: EducationDocumentType,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setMessage("");

    const file = event.currentTarget.files?.[0] ?? null;

    if (!file) {
      updateDocumentFile(documentType, null);
      return;
    }

    const validation = validateEducationDocumentFile(file);

    if (!validation.ok) {
      setMessage(validation.message);
      event.currentTarget.value = "";
      updateDocumentFile(documentType, null);
      return;
    }

    updateDocumentFile(documentType, file);
  }

  async function verifyMembershipNo() {
    setMessage("");
    setVerifiedMember(null);

    if (!form.membershipNo.trim()) {
      setMessage("Membership number required hai.");
      return;
    }

    setVerifying(true);

    const { data, error } = await supabase.rpc("verify_membership_no", {
      _membership_no: form.membershipNo.trim(),
    });

    setVerifying(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const result = data as unknown as VerifyMembershipResult;

    if (!result.valid) {
      setVerifiedMember(result);
      setMessage(result.reason || "Membership verification failed.");
      return;
    }

    setVerifiedMember(result);

    setForm((prev) => ({
      ...prev,
      membershipNo: result.membership_no || prev.membershipNo,
      district: prev.district || result.district || "",
      taluka: prev.taluka || result.taluka || "",
    }));

    setMessage("Membership verified successfully.");
  }

  function validateRequiredDocuments() {
    const missingDocuments = educationRequiredDocumentTypes.filter(
      (documentType) => !documentFiles[documentType],
    );

    if (missingDocuments.length > 0) {
      const labels = missingDocuments
        .map(
          (documentType) =>
            educationDocumentOptions.find((item) => item.type === documentType)
              ?.label ?? documentType,
        )
        .join(", ");

      return `Required documents upload karen: ${labels}`;
    }

    return "";
  }

  async function uploadApplicationDocuments({
    userId,
    applicationId,
  }: {
    userId: string;
    applicationId: string;
  }) {
    const selectedDocuments = educationDocumentOptions.filter(
      (document) => documentFiles[document.type],
    );

    for (const document of selectedDocuments) {
      const file = documentFiles[document.type];

      if (!file) continue;

      const validation = validateEducationDocumentFile(file);

      if (!validation.ok) {
        throw new Error(`${document.label}: ${validation.message}`);
      }

      const filePath = createEducationDocumentStoragePath({
        userId,
        applicationId,
        documentType: document.type,
        fileName: file.name,
      });

      const { error: uploadError } = await supabase.storage
        .from(EDUCATION_DOCUMENT_BUCKET)
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType: file.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`${document.label}: ${uploadError.message}`);
      }

      const { error: documentError } = await supabase
        .from("program_documents")
        .insert({
          application_id: applicationId,
          program_key: "education",
          uploaded_by: userId,
          document_type: document.type,
          file_path: filePath,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size,
          verification_status: "pending",
          is_verified: false,
        });

      if (documentError) {
        throw new Error(`${document.label}: ${documentError.message}`);
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Application submit karne ke liye pehle login/signup karen.");
      return;
    }

    if (!verifiedMember?.valid) {
      setMessage("Pehle membership number verify karen.");
      return;
    }

    if (!form.studentName.trim()) {
      setMessage("Student full name required hai.");
      return;
    }

    if (!form.phone.trim()) {
      setMessage("Phone number required hai.");
      return;
    }

    if (!form.reason.trim()) {
      setMessage("Reason / need details required hain.");
      return;
    }

    const documentError = validateRequiredDocuments();

    if (documentError) {
      setMessage(documentError);
      return;
    }

    setSubmitting(true);

    const details = {
      guardian_name: form.guardianName.trim(),
      institute_name: form.instituteName.trim(),
      institute_type: form.instituteType,
      class_degree: form.classDegree.trim(),
      board_university: form.boardUniversity.trim(),
      academic_year: form.academicYear.trim(),
      last_exam: form.lastExam.trim(),
      total_marks: form.totalMarks.trim(),
      obtained_marks: form.obtainedMarks.trim(),
      percentage: form.percentage.trim(),
      support_type: form.supportType,
      required_amount: form.requiredAmount.trim(),
      reason: form.reason.trim(),
    };

    const { data: applicationRow, error: applicationError } = await supabase
      .from("program_applications")
      .insert({
        program_key: "education",
        applicant_user_id: user.id,
        membership_no: form.membershipNo.trim(),
        relationship_to_member: form.relationshipToMember,
        applicant_name: form.studentName.trim(),
        applicant_cnic: form.studentCnic.trim() || null,
        phone: form.phone.trim(),
        email: form.email.trim() || user.email || null,
        district: form.district.trim() || null,
        taluka: form.taluka.trim() || null,
        address: form.address.trim() || null,
        details,
        status: "submitted",
      })
      .select("id")
      .single();

    if (applicationError || !applicationRow?.id) {
      setSubmitting(false);
      setMessage(applicationError?.message || "Application submit nahi ho saki.");
      return;
    }

    try {
      await uploadApplicationDocuments({
        userId: user.id,
        applicationId: applicationRow.id,
      });
    } catch (error) {
      setSubmitting(false);
      setMessage(
        error instanceof Error
          ? `Application submit ho gayi, lekin document upload me issue aya: ${error.message}`
          : "Application submit ho gayi, lekin document upload me issue aya.",
      );
      return;
    }

    setSubmitting(false);
    navigate({ to: "/programs/education/my-applications" });
  }

  return (
    <main className="program-apply-page min-h-screen bg-slate-50" dir="ltr">
      <section className="bg-slate-950 px-4 py-14 text-white md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className={`max-w-3xl space-y-5 ${textAlignClass}`} dir={textDir}>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
              <ShieldCheck className="h-4 w-4 text-amber-300" />
              {copy.program.badge}
            </div>

            <h1 className="text-4xl font-black md:text-6xl">
              {copy.program.title}
            </h1>

            <p className="text-lg leading-8 text-white/75">
              {copy.program.description}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-16">
        <form
          onSubmit={handleSubmit}
          className="program-apply-form mx-auto grid max-w-6xl gap-6"
        >
          <div className="program-apply-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-black text-slate-950">
              {copy.common.membershipVerification}
            </h2>

            <p className="mt-2 text-sm leading-7 text-slate-600">
              {copy.common.verifyMembershipText}
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto]">
              <input
                value={form.membershipNo}
                onChange={(event) =>
                  updateField("membershipNo", event.target.value)
                }
                placeholder={copy.common.membershipPlaceholder}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500"
              />

              <button
                type="button"
                onClick={verifyMembershipNo}
                disabled={verifying}
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-6 py-3 font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {verifying ? (
                  <Loader2 className={`${iconBeforeClass} h-4 w-4 animate-spin`} />
                ) : (
                  <CheckCircle2 className={`${iconBeforeClass} h-4 w-4`} />
                )}
                {copy.common.verify}
              </button>
            </div>

            {verifiedMember?.valid ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                {copy.common.verified}: {verifiedMember.full_name || copy.common.approvedMember} —{" "}
                {verifiedMember.district || copy.common.district} /{" "}
                {verifiedMember.taluka || copy.common.taluka}
              </div>
            ) : null}
          </div>

          <div className="program-apply-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-black text-slate-950">
              {copy.program.applicantDetails}
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                value={form.studentName}
                onChange={(event) =>
                  updateField("studentName", event.target.value)
                }
                placeholder={copy.program.studentName}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <input
                value={form.guardianName}
                onChange={(event) =>
                  updateField("guardianName", event.target.value)
                }
                placeholder={copy.program.guardianName}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <select
                value={form.relationshipToMember}
                onChange={(event) =>
                  updateField(
                    "relationshipToMember",
                    event.target.value as MemberRelationship,
                  )
                }
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              >
                {relationshipOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {copy.common.relationship}: {option.label}
                  </option>
                ))}
              </select>

              <input
                value={form.studentCnic}
                onChange={(event) =>
                  updateField("studentCnic", event.target.value)
                }
                placeholder={copy.program.studentCnic}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <input
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder={copy.common.phone}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <input
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder={copy.common.emailOptional}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <input
                value={form.district}
                onChange={(event) =>
                  updateField("district", event.target.value)
                }
                placeholder={copy.common.district}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <input
                value={form.taluka}
                onChange={(event) => updateField("taluka", event.target.value)}
                placeholder={copy.common.taluka}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />
            </div>

            <textarea
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              placeholder={copy.program.fullAddress}
              rows={3}
              className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
            />
          </div>

          <div className="program-apply-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-black text-slate-950">
              {copy.program.academicDetails}
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input
                value={form.instituteName}
                onChange={(event) =>
                  updateField("instituteName", event.target.value)
                }
                placeholder={copy.program.instituteName}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <select
                value={form.instituteType}
                onChange={(event) =>
                  updateField("instituteType", event.target.value)
                }
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              >
                {instituteTypeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <input
                value={form.classDegree}
                onChange={(event) =>
                  updateField("classDegree", event.target.value)
                }
                placeholder={copy.program.classDegree}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <input
                value={form.boardUniversity}
                onChange={(event) =>
                  updateField("boardUniversity", event.target.value)
                }
                placeholder={copy.program.boardUniversity}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <input
                value={form.academicYear}
                onChange={(event) =>
                  updateField("academicYear", event.target.value)
                }
                placeholder={copy.program.academicYear}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <input
                value={form.lastExam}
                onChange={(event) =>
                  updateField("lastExam", event.target.value)
                }
                placeholder={copy.program.lastExam}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <input
                value={form.totalMarks}
                onChange={(event) =>
                  updateField("totalMarks", event.target.value)
                }
                placeholder={copy.program.totalMarks}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <input
                value={form.obtainedMarks}
                onChange={(event) =>
                  updateField("obtainedMarks", event.target.value)
                }
                placeholder={copy.program.obtainedMarks}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />

              <input
                value={form.percentage}
                onChange={(event) =>
                  updateField("percentage", event.target.value)
                }
                placeholder={copy.program.percentage}
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="program-apply-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h2 className="text-2xl font-black text-slate-950">
              {copy.program.supportRequest}
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select
                value={form.supportType}
                onChange={(event) =>
                  updateField("supportType", event.target.value)
                }
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              >
                {supportTypeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <input
                value={form.requiredAmount}
                onChange={(event) =>
                  updateField("requiredAmount", event.target.value)
                }
                placeholder={copy.program.requiredAmount}
                type="number"
                className="rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
              />
            </div>

            <textarea
              value={form.reason}
              onChange={(event) => updateField("reason", event.target.value)}
              placeholder={copy.program.reason}
              rows={5}
              className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
            />
          </div>

          <div className="program-apply-card rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  {copy.program.documentsTitle}
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                  {copy.common.uploadHint5}
                </p>
              </div>

              <span className="inline-flex w-fit rounded-full bg-amber-100 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-amber-800">
                {copy.common.documentsRequired}
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              {educationDocumentOptions.map((document) => {
                const selectedFile = documentFiles[document.type];

                return (
                  <div
                    key={document.type}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-black text-slate-950">
                            {document.label}
                          </h3>

                          {document.required ? (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-red-700">
                              {copy.common.required}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600">
                              {copy.common.optional}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {document.description}
                        </p>

                        {selectedFile ? (
                          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="font-bold">
                              {selectedFile.name}
                            </span>
                            <span className="text-emerald-700">
                              {formatEducationFileSize(selectedFile.size)}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                        <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                          <Upload className={`${iconBeforeClass} h-4 w-4`} />
                          {selectedFile ? copy.common.changeFile : copy.common.uploadFile}
                          <input
                            type="file"
                            accept={EDUCATION_DOCUMENT_ACCEPT}
                            className="hidden"
                            onChange={(event) =>
                              handleDocumentChange(document.type, event)
                            }
                          />
                        </label>

                        {selectedFile ? (
                          <button
                            type="button"
                            onClick={() => updateDocumentFile(document.type, null)}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                          >
                            <Trash2 className={`${iconBeforeClass} h-4 w-4`} />
                            {copy.common.remove}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {message ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700">
              {message}
            </div>
          ) : null}

          <div className="flex flex-col justify-end gap-3 sm:flex-row">
            <Link
              to="/programs/education"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-black text-slate-800 no-underline"
            >
              {copy.common.back}
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-6 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className={`${iconBeforeClass} h-4 w-4 animate-spin`} />
              ) : null}
              {submitting ? copy.common.submitting : copy.common.submitApplication}
              <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}