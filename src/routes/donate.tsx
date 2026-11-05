// src/routes/donate.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeIndianRupee,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Trophy,
  Upload,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { submitDonationAction } from "../lib/donation-action";
import { DonationSecurityCheck } from "../components/DonationSecurityCheck";
import { supabase } from "../lib/supabase/client";
import {
  DONATION_RECEIPT_ACCEPT,
  buildDonationReferenceHint,
  donationPaymentMethodOptions,
  donationPurposeOptions,
  formatDonationMoney,
  getDonationPaymentMethodLabel,
  getDonationPurposeLabel,
  validateDonationReceiptFile,
  type ApprovedMemberForDonation,
  type DonationPaymentMethod,
  type DonationPurpose,
} from "../lib/donations";

export const Route = createFileRoute("/donate")({
  component: DonatePage,
});

type DonationFormState = {
  donorName: string;
  contact: string;
  amount: string;
  purpose: DonationPurpose;
  paymentMethod: DonationPaymentMethod;
  transactionReference: string;
  notes: string;
};

const initialForm: DonationFormState = {
  donorName: "",
  contact: "",
  amount: "",
  purpose: "general_fund",
  paymentMethod: "bank",
  transactionReference: "",
  notes: "",
};

function DonatePage() {
  const [member, setMember] = useState<ApprovedMemberForDonation | null>(null);
  const [form, setForm] = useState<DonationFormState>(initialForm);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaRevision, setCaptchaRevision] = useState(0);
  const [website, setWebsite] = useState("");

  useEffect(() => {
    const key = sessionStorage.getItem("jas-donation-key") || crypto.randomUUID();
    sessionStorage.setItem("jas-donation-key", key);
    setIdempotencyKey(key);
    const draft = sessionStorage.getItem("jas-donation-draft");
    if (draft) { try { setForm({ ...initialForm, ...JSON.parse(draft) }); } catch { /* Ignore invalid local draft. */ } }
    void loadApprovedMember();
  }, []);

  async function loadApprovedMember() {
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMember(null);
      return;
    }

    const { data, error } = await supabase
      .from("members")
      .select(
        "id, user_id, member_no, full_name, father_name, mobile, district, taluka, status",
      )
      .eq("user_id", user.id)
      .maybeSingle()
      .returns<ApprovedMemberForDonation | null>();

    if (error) {
      setMember(null);
      return;
    }

    if (!data || data.status !== "approved" || !data.member_no) {
      setMember(null);
      return;
    }

    setMember(data);
    if (!sessionStorage.getItem("jas-donation-draft")) setForm(current => ({ ...current, donorName: data.full_name, contact: data.mobile }));
  }

  function handleReceipt(event: ChangeEvent<HTMLInputElement>) {
    setReceiptFile(event.target.files?.[0] || null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Valid donation amount enter karen.");
      return;
    }

    if (!form.transactionReference.trim()) {
      setMessage("Bank/JazzCash/Easypaisa transaction reference required hai.");
      return;
    }

    setSaving(true);
    setMessage("");
    setSuccess("");

    sessionStorage.setItem("jas-donation-draft", JSON.stringify(form));
    try {
      if (receiptFile) {
        const fileError = validateDonationReceiptFile(receiptFile);
        if (fileError) throw new Error(fileError);
      }
      const { data: { session } } = await supabase.auth.getSession();
      const payload = new FormData();
      for (const [key, value] of Object.entries(form)) payload.set(key, value);
      payload.set("idempotencyKey", idempotencyKey);
      payload.set("accessToken", session?.access_token || "");
      payload.set("captchaToken", captchaToken);
      payload.set("website", website);
      if (receiptFile) payload.set("receipt", receiptFile);
      const result = await submitDonationAction({ data: payload });
      setSuccess(`Donation reference: ${result.donationNo}. Pending verification — this is not confirmation of payment.`);
      setForm(initialForm);
      setReceiptFile(null);
      sessionStorage.removeItem("jas-donation-draft");
      const nextKey = crypto.randomUUID();
      sessionStorage.setItem("jas-donation-key", nextKey);
      setIdempotencyKey(nextKey);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Response interrupted. Retry with the same details; your submission will not be duplicated.");
    } finally {
      setSaving(false);
      setCaptchaToken("");
      setCaptchaRevision(value => value + 1);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="bg-slate-950 px-4 py-12 text-white md:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold">
            <BadgeIndianRupee className="h-4 w-4 text-amber-300" />
            JAS Donation Fund
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <h1 className="text-4xl font-black md:text-6xl">
                Donate for JAS Community Support
              </h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-white/70">
                Education, health, welfare aur general fund ke liye donation
                submit karen. Anyone can submit, with or without membership. Every donation remains pending until manually verified.
              </p>
            </div>

            <div className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-5">
              <Trophy className="h-8 w-8 text-amber-300" />
              <h2 className="mt-3 text-xl font-black">Top Donor Leaderboard</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Sirf approved donations count hoti hain. Pending ya rejected
                donation leaderboard mein show nahi hoti.
              </p>
              <Link
                to="/donors"
                className="jas-dark-action-link mt-4 inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-black no-underline"
              >
                View Donors
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 md:py-14">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[390px_1fr]">
          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5 text-emerald-700" />
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Manual Verification Flow
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Bank/JazzCash/Easypaisa transfer ke baad reference number
                    aur receipt screenshot submit karen. Verification ke baad payment confirm hogi. Receipt optional hai.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                Payment Instructions
              </h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  <strong>Bank/JazzCash/Easypaisa:</strong> transfer reference
                  mein apna Member ID ya donation reference likhen.
                </p>
                <p>
                  <strong>Reference hint:</strong>{" "}
                  {buildDonationReferenceHint(member?.member_no)}
                </p>
                <p>
                  <strong>Note:</strong> Account details admin settings/website
                  par official announce honi chahiyen.
                </p>
              </div>
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
              <form onSubmit={handleSubmit} className="space-y-6">
                {member ? <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                    Verified Member
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {member.full_name}
                  </h2>
                  <div className="mt-4 grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                    <Info label="Father" value={member.father_name} />
                    <Info label="Member ID" value={member.member_no || "-"} />
                    <Info label="District" value={member.district} />
                    <Info label="Taluka" value={member.taluka || "-"} />
                  </div>
                </div> : <h2 className="text-2xl font-black">Public donation form</h2>}

                {message ? <Alert tone="error" message={message} /> : null}
                {success ? <Alert tone="success" message={success} /> : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Donor name" value={form.donorName} onChange={value => setForm({ ...form, donorName: value })} required />
                  <Input label="Email or phone" value={form.contact} onChange={value => setForm({ ...form, contact: value })} required />
                  <Input
                    label="Donation Amount"
                    type="number"
                    value={form.amount}
                    onChange={(value) => setForm({ ...form, amount: value })}
                    required
                  />

                  <Select
                    label="Purpose"
                    value={form.purpose}
                    onChange={(value) =>
                      setForm({ ...form, purpose: value as DonationPurpose })
                    }
                    options={donationPurposeOptions}
                  />

                  <Select
                    label="Payment Method"
                    value={form.paymentMethod}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        paymentMethod: value as DonationPaymentMethod,
                      })
                    }
                    options={donationPaymentMethodOptions}
                  />

                  <Input
                    label="Transaction / Reference No"
                    value={form.transactionReference}
                    onChange={(value) =>
                      setForm({ ...form, transactionReference: value })
                    }
                    required
                  />
                </div>

                <label className="block rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-700">
                  <span className="inline-flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Receipt Screenshot / Transfer Proof
                  </span>
                  <input
                    key={idempotencyKey}
                    type="file"
                    accept={DONATION_RECEIPT_ACCEPT}
                    onChange={handleReceipt}
                    className="mt-3 block w-full text-sm"
                  />
                  {receiptFile ? (
                    <span className="mt-2 block text-xs text-slate-500">
                      Selected: {receiptFile.name}
                    </span>
                  ) : (
                    <span className="mt-2 block text-xs text-slate-500">
                      Optional: PDF, JPG, PNG or WEBP, maximum 2MB.
                    </span>
                  )}
                </label>

                <Textarea
                  label="Message (optional)"
                  value={form.notes}
                  onChange={(value) => setForm({ ...form, notes: value })}
                />

                <p className="text-sm text-slate-600">Submission is pending verification and is not a verified payment. If the response is interrupted, retry with the same details. After reloading, reselect the same receipt if one was attached.</p>
                <label className="hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
                <DonationSecurityCheck key={captchaRevision} onToken={setCaptchaToken} />

                <button
                  type="submit"
                  disabled={saving || !idempotencyKey}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-emerald-900 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Submit Donation for Verification
                </button>
              </form>
          </section>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-black text-slate-950">{value}</p>
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
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0.01" : undefined}
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
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold outline-none transition focus:border-amber-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-3xl border p-4 text-sm font-semibold shadow-sm ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {message}
    </div>
  );
}

export function DonationPreviewText({
  amount,
  purpose,
  method,
}: {
  amount: string;
  purpose: DonationPurpose;
  method: DonationPaymentMethod;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
      <FileText className="mb-2 h-4 w-4 text-slate-400" />
      {formatDonationMoney(Number(amount || 0))} donation for{" "}
      {getDonationPurposeLabel(purpose)} via{" "}
      {getDonationPaymentMethodLabel(method)}
    </div>
  );
}
