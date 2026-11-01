import { verificationErrorText } from '../../../lib/verify/validation'
import { useI18n } from '../../../lib/i18n'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  IdCard,
  Landmark,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  fetchOfficeBearerVerification,
  formatOfficeBearerDisplayText,
  getCommitteeLocation,
  getCommitteeTypeLabel,
  type PublicOfficeBearerVerificationRecord,
} from '../../../lib/committees-public'
import { formatDesignationExpiry, formatDesignationValidity } from '../../../lib/designation-validity'

export const Route = createFileRoute('/verify/office-bearer/$officeBearerId')({
  component: OfficeBearerVerificationPage,
})

function OfficeBearerVerificationPage() {
  const { language } = useI18n()
  const { officeBearerId } = Route.useParams()
  const [card, setCard] = useState<PublicOfficeBearerVerificationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadVerification() {
      setLoading(true)
      setError('')

      try {
        const result = await fetchOfficeBearerVerification(officeBearerId)
        if (!cancelled) setCard(result)
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message === 'VERIFY_INVALID_NUMBER'
              ? ({ en: 'Invalid office-bearer card ID. Use JAS-OB-YYYY-XXXXXXXX format.', ur: 'عہدیدار کارڈ نمبر درست نہیں۔ JAS-OB-YYYY-XXXXXXXX کی شکل استعمال کریں۔', sd: 'عهديدار ڪارڊ نمبر درست ناهي. JAS-OB-YYYY-XXXXXXXX جي صورت استعمال ڪريو.' })[language]
              : verificationErrorText(language, err instanceof Error ? err.message : ''),
          )
          setCard(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadVerification()

    return () => {
      cancelled = true
    }
  }, [officeBearerId, language])

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#06130f,#0f5138)] px-4 py-10 text-white">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#f6d56f]">
            Verifying Office Bearer Card
          </p>
          <h1 className="mt-3 text-3xl font-black">Checking official JAS record...</h1>
        </div>
      </main>
    )
  }

  if (error || !card) {
    return <InvalidVerificationState message={error || 'This office bearer card could not be verified.'} />
  }

  return <VerifiedOfficeBearer card={card} requestedId={officeBearerId} />
}

function VerifiedOfficeBearer({
  card,
  requestedId,
}: {
  card: PublicOfficeBearerVerificationRecord
  requestedId: string
}) {
  const committee = card.committee
  const officialId = card.office_bearer_id
  const memberName = formatOfficeBearerDisplayText(
    card.member.full_name || card.full_name_snapshot,
  )
  const fatherName = formatOfficeBearerDisplayText(
    card.member.father_name || card.father_name_snapshot || 'N/A',
  )
  const designation = formatOfficeBearerDisplayText(card.designation_title)
  const committeeName = formatOfficeBearerDisplayText(
    committee?.name || 'Committee record',
  )
  const level = committee ? getCommitteeTypeLabel(committee.committee_type) : 'JAS Committee'
  const location = committee ? getCommitteeLocation(committee) : getSnapshotLocation(card)
  const validity = formatDesignationValidity(card)
  const expiryDate = formatDesignationExpiry(card)

  const isExactMatch = useMemo(
    () => officialId.toUpperCase() === requestedId.trim().toUpperCase(),
    [officialId, requestedId],
  )

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#06130f,#0b3024_48%,#111827)] px-4 py-8 text-white sm:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white no-underline transition hover:bg-white/15"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to JAS
        </Link>

        <section className="overflow-hidden rounded-[2.25rem] border border-[#f6d56f]/30 bg-white text-slate-950 shadow-2xl">
          <div className="relative bg-[linear-gradient(135deg,#06130f,#0f5138)] p-6 text-white sm:p-8">
            <div className="pointer-events-none absolute inset-0 opacity-[0.14]" style={{ backgroundImage: 'radial-gradient(circle at 28px 28px,#f6d56f 2px,transparent 2px)', backgroundSize: '48px 48px' }} />
            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-[#f6d56f]/35 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#f6d56f]">
                  <BadgeCheck className="h-4 w-4" />
                  Office Bearer Verified
                </p>
                <h1 className="mt-4 text-[clamp(2.3rem,6vw,4.8rem)] font-black leading-[0.9] tracking-[-0.06em]">
                  Active Authority
                  <span className="block text-[#f6d56f]">Record Confirmed</span>
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72 sm:text-base">
                  This QR confirms that the bearer currently has a valid active JAS committee designation in the official public organization record.
                </p>
              </div>

              <div className="rounded-[2rem] border border-[#f6d56f]/35 bg-[#f6d56f] px-6 py-5 text-emerald-950 shadow-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em]">Status</p>
                <p className="mt-1 flex items-center gap-2 text-3xl font-black uppercase">
                  <ShieldCheck className="h-7 w-7" />
                  Valid
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#06130f,#0f5138)] text-2xl font-black text-[#f6d56f] shadow-sm">
                  <UserRound className="h-9 w-9" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                    Verified Bearer
                  </p>
                  <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                    {memberName}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">Father: {fatherName}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <VerifyInfo icon={<IdCard />} label="Office Bearer ID" value={officialId} />
                <VerifyInfo icon={<BadgeCheck />} label="Designation" value={designation} />
                <VerifyInfo icon={<Landmark />} label="Committee" value={committeeName} />
                <VerifyInfo icon={<ShieldCheck />} label="Level" value={level} />
                <VerifyInfo icon={<MapPin />} label="Jurisdiction" value={location} />
                <VerifyInfo icon={<CalendarDays />} label="Validity" value={validity} />
                <VerifyInfo icon={<CalendarDays />} label="Expiry Date" value={expiryDate} />
              </div>
            </section>

            <aside className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                Verification Result
              </p>
              <h3 className="mt-2 text-2xl font-black">Valid office bearer card</h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-emerald-900/75">
                The QR code links to a public JAS verification route. Accept this authority only while the status remains valid, the expiry date has not passed, and the committee details match the presented card.
              </p>

              <div className="mt-5 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-emerald-100">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Match Quality
                </p>
                <p className="mt-2 text-lg font-black text-slate-950">
                  {isExactMatch ? 'Exact ID match' : 'Short ID match'}
                </p>
              </div>

              <Link to="/committees" className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-900 px-5 py-3 text-sm font-black text-white no-underline transition hover:bg-emerald-800">
                View Public Committees
              </Link>
            </aside>
          </div>
        </section>
      </div>
    </main>
  )
}

function InvalidVerificationState({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#450a0a,#111827)] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-red-200/20 bg-white p-6 text-slate-950 shadow-2xl sm:p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-700 ring-1 ring-red-100">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-red-700">
          Verification Failed
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Office bearer card not verified
        </h1>
        <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
          {message} The designation may be inactive, expired, private, removed, or the verification link may be incorrect.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/" className="primary-btn no-underline">Go to Home</Link>
          <Link to="/committees" className="secondary-btn no-underline">View Public Committees</Link>
        </div>
      </div>
    </main>
  )
}

function VerifyInfo({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-emerald-800">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50">
          {icon}
        </span>
        <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
      </div>
      <p className="mt-3 break-words text-lg font-black leading-6 text-slate-950">{value}</p>
    </div>
  )
}

function getSnapshotLocation(card: PublicOfficeBearerVerificationRecord) {
  return [card.taluka_snapshot, card.district_snapshot].filter(Boolean).join(', ') || 'Sindh'
}
