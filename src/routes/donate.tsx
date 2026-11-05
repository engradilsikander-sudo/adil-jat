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
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { submitDonationAction } from "../lib/donation-action";
import { publicDonationFieldsSchema } from "../lib/donation-intake";
import { clearDonationDraft, restoreDonationDraft, saveDonationDraft, describeDonationReceipt, donationRecoveryProblem, DONATION_DRAFT_TTL, type DonationDraft, type DonationFields } from "../lib/donation-draft";
import { donationErrorMessages } from "../lib/donation-result";
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
  type ApprovedMemberForDonation,
  type DonationPaymentMethod,
  type DonationPurpose,
} from "../lib/donations";

export const Route = createFileRoute("/donate")({
  component: DonatePage,
});

type DonationFormState = DonationFields;

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
  const [owner, setOwner] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState<DonationDraft | null>(null);
  const draftRef = useRef<DonationDraft | null>(null);
  const ownerRef = useRef<string | null | undefined>(undefined);
  const revision = useRef(0);
  const busy = useRef(false);
  const syncIdentity = useRef<(id: string | null) => void>(() => {});

  function rememberDraft(value: DonationDraft | null) {
    draftRef.current = value;
    setDraft(value);
  }

  function discardDraft(notice: string) {
    try { clearDonationDraft(sessionStorage); }
    catch { setMessage("Browser draft storage is unavailable. Close this tab before changing accounts."); return; }
    revision.current++;
    rememberDraft(null);
    setForm(initialForm);
    setReceiptFile(null);
    setIdempotencyKey(crypto.randomUUID());
    setCaptchaToken("");
    setCaptchaRevision(value => value + 1);
    setSuccess("");
    setMessage(notice);
  }

  useEffect(() => {
    let active = true;
    const acceptIdentity = (id: string | null) => {
      if (!active || ownerRef.current === id) return;
      const changed = ownerRef.current !== undefined;
      ownerRef.current = id;
      revision.current++;
      setOwner(id);
      setMember(null);
      setForm(initialForm);
      setReceiptFile(null);
      rememberDraft(null);
      setSuccess("");
      setCaptchaToken("");
      setCaptchaRevision(value => value + 1);
      setIdempotencyKey(crypto.randomUUID());
      try {
        if (changed) clearDonationDraft(sessionStorage);
        const restored = restoreDonationDraft(sessionStorage, id);
        if (restored.draft) {
          rememberDraft(restored.draft);
          setForm(restored.draft.fields);
          setIdempotencyKey(restored.draft.idempotencyKey);
        }
        setMessage(changed || restored.discarded
          ? "A previous donation draft was cleared because the account changed, it expired, or it could not be safely restored. This does not delete a submitted donation. Verify any earlier submission before starting again."
          : restored.draft?.unresolved ? "An unresolved submission was restored. Retry with the same details and original receipt; it may already be saved." : "");
      } catch {
        setMessage("Browser draft storage is unavailable. Enable session storage before submitting so interrupted payments can be recovered safely.");
      }
    };
    syncIdentity.current = acceptIdentity;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => acceptIdentity(session?.user.id || null));
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || ownerRef.current !== undefined) return;
      if (error) setMessage("Your session could not be checked. Reload before submitting a donation.");
      else acceptIdentity(data.session?.user.id || null);
    }).catch(() => { if (active) setMessage("Your session could not be checked. Reload before submitting a donation."); });
    return () => { active = false; subscription.unsubscribe(); revision.current++; };
  }, []);

  useEffect(() => {
    if (!owner) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase.from("members")
        .select("id, user_id, member_no, full_name, father_name, mobile, district, taluka, status")
        .eq("user_id", owner).maybeSingle().returns<ApprovedMemberForDonation | null>();
      if (!active || error || !data || data.status !== "approved" || !data.member_no) return;
      setMember(data);
      // A late member lookup must not overwrite a restored draft or donor edits.
      if (!draftRef.current) setForm(current => ({ ...current, donorName: current.donorName || data.full_name, contact: current.contact || data.mobile }));
    })().catch(() => { /* Membership prefill is optional; public intake remains available. */ });
    return () => { active = false; };
  }, [owner]);

  useEffect(() => {
    if (!draft) return;
    const timer = window.setTimeout(() => {
      if (draftRef.current === draft) discardDraft("The 24-hour donation draft expired and was cleared. Any previously submitted donation still exists; verify it before starting a new submission.");
    }, Math.max(0, draft.createdAt + DONATION_DRAFT_TTL - Date.now()));
    return () => window.clearTimeout(timer);
  }, [draft]);

  function handleReceipt(event: ChangeEvent<HTMLInputElement>) {
    setReceiptFile(event.target.files?.[0] || null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || ownerRef.current === undefined || !idempotencyKey) return;
    busy.current = true;
    setSaving(true);
    setMessage("");
    setSuccess("");
    const startedAtRevision = revision.current;
    let sent = false;
    try {
      const parsed = publicDonationFieldsSchema.safeParse(form);
      if (!parsed.success) { setMessage(donationErrorMessages.validation); return; }
      const prior = draftRef.current;
      if (prior && Date.now() - prior.createdAt >= DONATION_DRAFT_TTL) {
        discardDraft("The donation draft expired. No retry was sent. Verify any previous donation before starting again.");
        return;
      }
      const receipt = await describeDonationReceipt(receiptFile);
      if (revision.current !== startedAtRevision) return;
      if (prior) {
        const problem = donationRecoveryProblem(prior, parsed.data, receipt);
        if (problem) { setMessage(problem); return; }
      }
      const { data: { session }, error } = await supabase.auth.getSession();
      if (revision.current !== startedAtRevision) return;
      if (error) { setMessage(donationErrorMessages.session); return; }
      if ((session?.user.id || null) !== ownerRef.current) {
        syncIdentity.current(session?.user.id || null);
        return;
      }
      const attempt: DonationDraft = {
        version: 1, createdAt: prior?.createdAt ?? Date.now(), ownerId: ownerRef.current!,
        idempotencyKey, fields: parsed.data, receipt, unresolved: true,
      };
      try { saveDonationDraft(sessionStorage, attempt); }
      catch { setMessage("This attempt was not sent. Enable browser session storage to keep a recoverable donation draft."); return; }
      rememberDraft(attempt);
      const payload = new FormData();
      for (const [key, value] of Object.entries(parsed.data)) payload.set(key, value);
      payload.set("idempotencyKey", idempotencyKey);
      payload.set("accessToken", session?.access_token || "");
      payload.set("captchaToken", captchaToken);
      payload.set("website", website);
      if (receiptFile) payload.set("receipt", receiptFile);
      sent = true;
      const result = await submitDonationAction({ data: payload });
      if (revision.current !== startedAtRevision) return;
      if (!result.ok) {
        // A definite rejection of this request cannot erase an earlier ambiguous outcome.
        if (result.outcome === "not_submitted" && !prior?.unresolved) {
          const rejected = { ...attempt, unresolved: false };
          saveDonationDraft(sessionStorage, rejected);
          rememberDraft(rejected);
        }
        setMessage(result.message + (prior?.unresolved && result.outcome === "not_submitted" ? " Your earlier attempt is still unresolved; keep the original details and key." : ""));
        return;
      }
      if (result.status !== "pending" || !result.donationNo) { setMessage(donationErrorMessages.unconfirmed); return; }
      try { clearDonationDraft(sessionStorage); }
      catch { setMessage("Saved, but the browser draft could not be cleared. Keep the reference below and do not submit again."); }
      rememberDraft(null);
      setForm(initialForm);
      setReceiptFile(null);
      setIdempotencyKey(crypto.randomUUID());
      setSuccess(`Donation reference: ${result.donationNo}. Pending verification — this is not confirmation of payment.`);
    } catch {
      if (revision.current === startedAtRevision) setMessage(sent ? donationErrorMessages.unconfirmed : donationErrorMessages.receipt);
    } finally {
      busy.current = false;
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
                <fieldset disabled={saving || owner === undefined} className="space-y-6 min-w-0">
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
                        paymentMethod: value as DonationFields["paymentMethod"],
                      })
                    }
                    options={donationPaymentMethodOptions.filter(option => option.value !== "cash")}
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

                {draft?.unresolved && draft.receipt && !receiptFile ? <p role="status" className="text-sm font-bold text-amber-900">Reselect the original receipt to recover this submission. The file contents must match.</p> : null}
                <p className="text-sm text-slate-600">Electronic transfers only; cash is handled through authorized internal collection. Submission is pending verification and is not a verified payment. If the response is interrupted, retry with the same details. After reloading, reselect the same receipt if one was attached.</p>
                <label className="hidden" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label>
                <DonationSecurityCheck key={captchaRevision} onToken={setCaptchaToken} />

                <button
                  type="submit"
                  disabled={saving || owner === undefined || !idempotencyKey}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-emerald-900 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Submit Donation for Verification
                </button>
                <button type="button" onClick={() => {
                  if (window.confirm("Clear this donation draft? This removes recovery details from this tab only. It does not cancel or delete any submitted donation. Verify unresolved payments before starting again.")) {
                    discardDraft("Donation draft cleared. Existing donations were not deleted. Verify any unresolved payment before starting a new submission.");
                  }
                }} className="w-full rounded-2xl border border-slate-300 px-6 py-3 font-bold">Clear Draft</button>
                <p className="text-xs text-slate-500">Recovery details stay in this tab for up to 24 hours from the first attempt. Receipt contents, login tokens and security-check tokens are never saved in the draft.</p>
                </fieldset>
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
