import { CreditCard, ExternalLink } from "lucide-react";
import {
  type MembershipPayment,
  type MembershipPaymentStatus,
  formatMembershipMoney,
  getMembershipPaymentDisplayStatus,
  getMembershipPaymentQrHelpText,
  getMembershipPaymentStatusClass,
  getMembershipPaymentStatusLabel,
} from "../../../lib/membership-fee";
import {
  formatDate,
  formatGatewayProvider,
  formatPaymentMethod,
} from "../../../lib/admin-member-detail.helpers";

export function AdminMemberPaymentPanel({
  payment,
  receiptSignedUrl,
  loadError,
  adminNote,
  onAdminNoteChange,
  onStatusUpdate,
  onReceiptUpload,
  actionLoading,
  receiptUploading,
  canEditReceipt,
}: {
  payment: MembershipPayment | null;
  receiptSignedUrl: string | null;
  loadError: string;
  adminNote: string;
  onAdminNoteChange: (value: string) => void;
  onStatusUpdate: (status: MembershipPaymentStatus) => void;
  onReceiptUpload: (file: File) => void;
  actionLoading: boolean;
  receiptUploading: boolean;
  canEditReceipt: boolean;
}) {
  const status = getMembershipPaymentDisplayStatus(payment);
  const paymentFinal = status === "paid" || status === "waived";
  const canUpdate = Boolean(payment) && !actionLoading;
  const canUploadReceipt =
    canEditReceipt &&
    !receiptUploading &&
    (!payment || payment.status === "pending" || payment.status === "failed") &&
    !paymentFinal;
  const receiptLabel =
    payment?.receipt_file_name ||
    (payment?.receipt_path ? "Uploaded" : "Not uploaded");

  return (
    <section className="admin-member-payment-panel rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            Membership Fee
          </p>
          <h2 className="mt-2 text-lg font-black text-slate-950">
            Payment Receipt & Verification
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Confirm the manual payment record and receipt before final approval.
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${getMembershipPaymentStatusClass(
            status,
          )}`}
        >
          {getMembershipPaymentStatusLabel(status)}
        </span>
      </div>

      {loadError ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          {loadError}
        </div>
      ) : null}

      {!payment ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          <p>No membership payment record found for this application.</p>
          <label
            className={`mt-4 inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-bold shadow-sm transition ${
              canUploadReceipt
                ? "cursor-pointer border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                : "cursor-not-allowed border-slate-200 bg-white text-slate-400"
            }`}
          >
            {receiptUploading
              ? "Uploading..."
              : "Upload Receipt & Create Pending Payment"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              disabled={!canUploadReceipt}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onReceiptUpload(file);
              }}
              className="sr-only"
            />
          </label>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoItem
              label="Base Fee"
              value={formatMembershipMoney(payment.base_amount)}
            />
            <InfoItem
              label="Tax / Charges"
              value={formatMembershipMoney(payment.tax_amount)}
            />
            <InfoItem
              label="Total Amount"
              value={`${formatMembershipMoney(payment.total_amount)} ${payment.currency}`}
            />
            <InfoItem
              label="Payment Method"
              value={formatPaymentMethod(payment)}
            />
            <InfoItem
              label="Gateway / Account"
              value={formatGatewayProvider(payment)}
            />
            <InfoItem
              label="Gateway Reference"
              value={payment.gateway_reference}
            />
            <InfoItem label="Receipt File" value={receiptLabel} />
            <InfoItem
              label="Receipt Uploaded"
              value={formatDate(payment.receipt_uploaded_at, true)}
            />
            <InfoItem
              label="Paid At"
              value={formatDate(payment.paid_at, true)}
            />
            <InfoItem
              label="Last Updated"
              value={formatDate(payment.updated_at, true)}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.45fr)]">
            <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="block text-xs font-black uppercase tracking-wide text-slate-500">
                Admin Note
              </span>
              <textarea
                value={adminNote}
                onChange={(event) => onAdminNoteChange(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="Optional note about payment verification."
              />
            </label>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{getMembershipPaymentQrHelpText()}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-slate-950">
                Payment Receipt
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {payment.receipt_path
                  ? receiptSignedUrl
                    ? "Private receipt link is ready for admin review."
                    : "Receipt file not available."
                  : "No receipt was uploaded with this payment record."}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <label
                className={`inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-bold shadow-sm transition ${
                  canUploadReceipt
                    ? "cursor-pointer border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                {receiptUploading
                  ? "Uploading..."
                  : payment?.receipt_path
                    ? "Replace Receipt"
                    : "Upload Receipt"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  disabled={!canUploadReceipt}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) onReceiptUpload(file);
                  }}
                  className="sr-only"
                />
              </label>

              {!canUploadReceipt && paymentFinal ? (
                <span className="inline-flex min-h-11 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800">
                  Final payment locked
                </span>
              ) : null}

              {receiptSignedUrl ? (
                <a
                  href={receiptSignedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold !text-white no-underline shadow-sm transition hover:bg-slate-800 hover:!text-white"
                  style={{ color: "#ffffff" }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Receipt
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => onStatusUpdate("pending")}
                disabled={!canUpdate || status === "pending"}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark Pending
              </button>
              <button
                type="button"
                onClick={() => onStatusUpdate("paid")}
                disabled={!canUpdate || status === "paid"}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading ? "Updating..." : "Mark Paid"}
              </button>
              <button
                type="button"
                onClick={() => onStatusUpdate("waived")}
                disabled={!canUpdate || status === "waived"}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-900 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark Waived
              </button>
              <button
                type="button"
                onClick={() => onStatusUpdate("failed")}
                disabled={!canUpdate || status === "failed"}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-900 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark Failed
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}


function InfoItem({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | number | null | undefined;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value || "N/A"}
      </p>
    </div>
  );
}
