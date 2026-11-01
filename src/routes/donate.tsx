// src/routes/donate.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BadgeIndianRupee,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Trophy,
  Upload,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";
import {
  DONATION_DOCUMENT_BUCKET,
  DONATION_RECEIPT_ACCEPT,
  buildDonationReferenceHint,
  createDonationReceiptStoragePath,
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
  amount: string;
  purpose: DonationPurpose;
  paymentMethod: DonationPaymentMethod;
  transactionReference: string;
  notes: string;
};

const initialForm: DonationFormState = {
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void loadApprovedMember();
  }, []);

  async function loadApprovedMember() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Donation submit karne ke liye pehle login karen.");
      setMember(null);
      setLoading(false);
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
      setMessage(error.message);
      setMember(null);
      setLoading(false);
      return;
    }

    if (!data || data.status !== "approved" || !data.member_no) {
      setMessage(
        "Donation form sirf approved JAS members ke liye available hai.",
      );
      setMember(null);
      setLoading(false);
      return;
    }

    setMember(data);
    setLoading(false);
  }

  function handleReceipt(event: ChangeEvent<HTMLInputElement>) {
    setReceiptFile(event.target.files?.[0] || null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!member) {
      setMessage("Approved member record load nahi hua.");
      return;
    }

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

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Session expire ho gaya. Dobara login karen.");
      setSaving(false);
      return;
    }

    let receiptPath: string | null = null;

    if (receiptFile) {
      const fileError = validateDonationReceiptFile(receiptFile);
      if (fileError) {
        setMessage(fileError);
        setSaving(false);
        return;
      }

      receiptPath = createDonationReceiptStoragePath({
        userId: user.id,
        folder: "donations",
        fileName: receiptFile.name,
      });

      const { error: uploadError } = await supabase.storage
        .from(DONATION_DOCUMENT_BUCKET)
        .upload(receiptPath, receiptFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: receiptFile.type,
        });

      if (uploadError) {
        setMessage(uploadError.message);
        setSaving(false);
        return;
      }
    }

    const payload = {
      donor_user_id: user.id,
      donor_member_id: member.id,
      donor_member_no_snapshot: member.member_no,
      donor_name_snapshot: member.full_name,
      donor_father_name_snapshot: member.father_name,
      donor_district_snapshot: member.district,
      donor_taluka_snapshot: member.taluka,
      donor_name: member.full_name,
      donor_phone: member.mobile,
      amount,
      payment_method: form.paymentMethod,
      purpose: form.purpose,
      district: member.district,
      taluka: member.taluka,
      transaction_reference: form.transactionReference.trim(),
      receipt_file_path: receiptPath,
      notes: form.notes.trim() || null,
      status: "pending",
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("finance_donations")
      .insert(payload as never)
      .select("donation_no")
      .single();

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setForm(initialForm);
    setReceiptFile(null);
    setSuccess(
      `Donation submitted. Finance admin verification ke baad leaderboard mein count hogi. Donation ID: ${String(
        data?.donation_no || "Pending",
      )}`,
    );
    setSaving(false);
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
                submit karen. Finance admin verification ke baad donation member
                leaderboard mein show hogi.
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
                    aur receipt screenshot submit karen. Finance admin match
                    karke approve karega.
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
            {loading ? (
              <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                Loading member record...
              </div>
            ) : message && !member ? (
              <RestrictedPanel message={message} />
            ) : member ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
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
                </div>

                {message ? <Alert tone="error" message={message} /> : null}
                {success ? <Alert tone="success" message={success} /> : null}

                <div className="grid gap-4 md:grid-cols-2">
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
                      PDF, JPG, PNG or WEBP allowed.
                    </span>
                  )}
                </label>

                <Textarea
                  label="Notes"
                  value={form.notes}
                  onChange={(value) => setForm({ ...form, notes: value })}
                />

                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  <strong>Leaderboard rule:</strong> Finance admin approval ke
                  baad donation donor leaderboard mein add hogi. Display format:
                  name, father name, member ID, total donated aur purpose.
                </div>

                <button
                  type="submit"
                  disabled={saving}
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
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}

function RestrictedPanel({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <div className="flex gap-3">
        <AlertTriangle className="mt-1 h-5 w-5 flex-none" />
        <div>
          <h2 className="text-xl font-black">Donation form restricted</h2>
          <p className="mt-2 text-sm leading-6">{message}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/login" className="secondary-btn">
              Login
            </Link>
            <Link to="/register" className="primary-btn">
              Complete Membership
            </Link>
          </div>
        </div>
      </div>
    </div>
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
