import { useI18n } from '../../lib/i18n'
import { formatMembershipMoney, MEMBERSHIP_BASE_FEE, MEMBERSHIP_MANUAL_PAYMENT_DETAILS as account, MEMBERSHIP_PAYMENT_QR_IMAGE_PATH, validateMembershipReceiptFile, type MembershipPayment } from '../../lib/membership-fee'

export function MembershipReceiptStep({ file, payment, disabled, onChange, onError }: {
  file: File | null; payment: MembershipPayment | null; disabled: boolean;
  onChange: (file: File) => void; onError: (message: string) => void;
}) {
  const { t } = useI18n()
  const final = payment?.status === 'paid' || payment?.status === 'waived'
  return <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4" aria-labelledby="membership-payment-title">
    <h3 id="membership-payment-title" className="font-bold">{t('signup.fee.label')}: {formatMembershipMoney(payment?.total_amount ?? MEMBERSHIP_BASE_FEE)} PKR</h3>
    {final ? <p className="mt-2">{t('register.payment.receiptLocked')}</p> : <>
      <p className="mt-2">{t('register.fee.manualInstruction')}</p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt>{t('register.payment.bankName')}</dt><dd className="font-bold">{account.bankName}</dd></div>
        <div><dt>{t('register.payment.accountTitle')}</dt><dd className="font-bold">{account.accountTitle}</dd></div>
        <div><dt>{t('register.payment.accountNo')}</dt><dd className="font-bold" dir="ltr">{account.accountNumber}</dd></div>
        <div><dt>{t('register.payment.iban')}</dt><dd className="break-all font-bold" dir="ltr">{account.iban}</dd></div>
      </dl>
      <img src={MEMBERSHIP_PAYMENT_QR_IMAGE_PATH} alt={t('dashboard.paymentAccount')} className="my-4 h-40 w-40 rounded-xl object-contain" />
      <label htmlFor="membership-receipt" className="secondary-btn mt-3 inline-flex cursor-pointer">{t('register.payment.uploadReceipt')}</label>
      <input id="membership-receipt" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" disabled={disabled}
        className="sr-only" aria-describedby="membership-receipt-hint"
        onChange={event => { const next = event.target.files?.[0]; event.target.value = ''; if (!next) return; const error=validateMembershipReceiptFile(next); if (error) onError(error); else onChange(next) }} />
      <p id="membership-receipt-hint" className="mt-2 text-sm">{t('register.payment.receiptHint').replace('{size}','5MB')}</p>
      <p role="status" className="mt-2 break-words font-semibold">{file?.name ?? (payment?.receipt_path ? t('register.payment.receiptUploaded') : '')}</p>
    </>}
  </section>
}
