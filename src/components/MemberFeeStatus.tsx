import { useEffect,useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { formatMembershipMoney, type MembershipPayment } from '../lib/membership-fee'
import { useI18n } from '../lib/i18n'

export function MemberFeeStatus({ memberId }: { memberId:string }) {
  const { t }=useI18n()
  const [payment,setPayment]=useState<MembershipPayment | null>(null)
  const [loading,setLoading]=useState(true)
  const [failed,setFailed]=useState(false)
  useEffect(() => {
    let active=true
    setLoading(true);setFailed(false)
    void (async () => {
      try {
        const result=await supabase.from('membership_payments').select('*').eq('member_id',memberId).maybeSingle()
        if (!active) return
        if(result.error) setFailed(true)
        else setPayment(result.data as MembershipPayment | null)
      } catch { if(active) setFailed(true) }
      finally { if(active) setLoading(false) }
    })()
    return () => { active=false }
  },[memberId])
  return <section className="rounded-2xl border border-teal-200 bg-teal-50 p-4" aria-live="polite">
    <h2 className="font-bold">{t('dashboard.feeStatus')}</h2>
    {loading ? <p>Loading…</p> : failed ? <p>Payment status unavailable. Refresh to retry.</p> : payment ? <p className="mt-2">{formatMembershipMoney(payment.total_amount)} PKR · {payment.status === 'pending' ? 'Pending verification' : payment.status}</p> : <p className="mt-2">No fee record. Existing application terms are retained.</p>}
  </section>
}
