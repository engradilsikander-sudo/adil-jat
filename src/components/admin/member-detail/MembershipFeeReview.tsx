import { useCallback, useEffect, useState } from 'react'
import { AdminMemberPaymentPanel } from './AdminMemberPaymentPanel'
import { fetchMembershipPaymentWithReceiptUrl, getAccessToken } from '../../../lib/admin-member-detail.helpers'
import { saveMembershipReceiptAction, updateMembershipPaymentStatusAction } from '../../../lib/admin/actions'
import { MEMBERSHIP_RECEIPT_BUCKET, validateMembershipReceiptFile, type MembershipPayment, type MembershipPaymentStatus } from '../../../lib/membership-fee'
import { supabase } from '../../../lib/supabase/client'
import { adminErrorMessage } from '../../../lib/admin/data-access'

export function MembershipFeeReview({ memberId, userId, feeRequired }: { memberId: string; userId: string; feeRequired: boolean }) {
  const [payment, setPayment] = useState<MembershipPayment | null>(null)
  const [url,setUrl] = useState<string | null>(null)
  const [error,setError] = useState('')
  const [note,setNote] = useState('')
  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)
  const [loadFailed,setLoadFailed] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result=await fetchMembershipPaymentWithReceiptUrl(memberId)
      setPayment(result.payment); setUrl(result.receiptSignedUrl); setNote(result.payment?.admin_note ?? '')
      setError(result.errorMessage ?? '');setLoadFailed(Boolean(result.errorMessage))
    } catch (err) { setError(adminErrorMessage(err));setLoadFailed(true) }
    finally { setLoading(false) }
  },[memberId])
  useEffect(() => { void load() },[load])
  async function status(next: MembershipPaymentStatus) {
    if (!payment) return
    setSaving(true);setError('')
    try {
      await updateMembershipPaymentStatusAction({ data: { memberId, paymentId:payment.id, status:next, adminNote:note || null, accessToken:await getAccessToken() } })
      await load()
    } catch (err) { setError(adminErrorMessage(err)) }
    finally { setSaving(false) }
  }
  async function receipt(file:File) {
    const invalid=validateMembershipReceiptFile(file)
    if (invalid) { setError(invalid);return }
    setSaving(true);setError('')
    try {
      const extension=({ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp','application/pdf':'pdf' } as Record<string,string>)[file.type]
      const path=`${userId}/receipt-${crypto.randomUUID()}.${extension}`
      const upload=await supabase.storage.from(MEMBERSHIP_RECEIPT_BUCKET).upload(path,file,{contentType:file.type,upsert:false})
      if (upload.error) throw upload.error
      await saveMembershipReceiptAction({ data: { memberId,paymentId:payment?.id ?? null,accessToken:await getAccessToken(),receipt:{receipt_path:path,receipt_file_name:file.name,receipt_mime_type:file.type,receipt_size_bytes:file.size,receipt_uploaded_at:new Date().toISOString()} } })
      await load()
    } catch (err) { setError(adminErrorMessage(err)) }
    finally { setSaving(false) }
  }
  if (loading) return <p role="status">Loading membership payment…</p>
  if (!feeRequired && !payment && !error) return <p className="rounded-2xl bg-teal-50 p-4">Existing application: no new membership fee is due.</p>
  return <div>
    <AdminMemberPaymentPanel payment={payment} receiptSignedUrl={url} loadError={error} adminNote={note} onAdminNoteChange={setNote}
      onStatusUpdate={next => void status(next)} onReceiptUpload={file => void receipt(file)} actionLoading={saving || loadFailed} receiptUploading={saving} canEditReceipt={!loadFailed} />
    {error ? <button type="button" className="secondary-btn mt-3" onClick={() => void load()}>Reload payment</button> : null}
  </div>
}
