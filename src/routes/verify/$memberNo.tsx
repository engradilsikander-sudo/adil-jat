// src/routes/verify/$memberNo.tsx
import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Home,
  IdCard,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react'
import { verificationErrorText } from '../../lib/verify/validation'
import { verifyMemberAction } from '../../lib/verify/actions'
import { useI18n, type AppLanguage } from '../../lib/i18n'

export const Route = createFileRoute('/verify/$memberNo')({
  component: VerifyMemberPage,
})

type MemberStatus = 'pending' | 'approved' | 'rejected'



type VerifyPageText = {
  loading: string
  title: string
  description: string
  refresh: string
  copyLink: string
  searchedMemberNo: string
  recordStatus: string
  verificationResult: string
  verified: string
  notFound: string
  approvedMember: string
  noRecord: string
  notApproved: string
  notFoundTitle: string
  notFoundMessage: string
  verifiedTitle: string
  verifiedMessage: string
  verifiedName: string
  memberNo: string
  status: string
  district: string
  taluka: string
  approvedAt: string
  verifiedBy: string
  approvedVerified: string
  notProvided: string
  copyMemberNo: string
  goHome: string
  notVerifiedTitle: string
  notVerifiedMessage: string
  currentStatus: string
  failedTitle: string
  failedMessage: string
  guidanceTitle: string
  guidanceMessage: string
  jasHome: string
  successCopyLink: string
  successCopyMemberNo: string
  errorCopyLink: string
  errorCopyMemberNo: string
  errorLoad: string
  statusApproved: string
  statusPending: string
  statusRejected: string
  statusUnknown: string
  notAvailable: string
  designation: string
  designationArea: string
  designationValidity: string
  designationExpiry: string
}

const verifyPageText: Record<AppLanguage, VerifyPageText> = {
  en: {
    loading: 'Verifying membership...',
    title: 'Membership Verification',
    description: 'Public QR verification page for JAS digital membership cards. Always confirm that the status below is approved and verified.',
    refresh: 'Refresh Status',
    copyLink: 'Copy Link',
    searchedMemberNo: 'Searched Member No',
    recordStatus: 'Record Status',
    verificationResult: 'Verification Result',
    verified: 'Verified',
    notFound: 'Not found',
    approvedMember: 'Approved member',
    noRecord: 'No record',
    notApproved: 'Not approved',
    notFoundTitle: 'Member Not Found',
    notFoundMessage: 'No JAS member record was found for this membership number. Please check the number printed on the card or scan the QR code again.',
    verifiedTitle: 'Verified Member',
    verifiedMessage: 'This membership is active and verified by Jatt Alliance Sindh.',
    verifiedName: 'Verified Name',
    memberNo: 'Member No',
    status: 'Status',
    district: 'District',
    taluka: 'Taluka',
    approvedAt: 'Approved At',
    verifiedBy: 'Verified By',
    approvedVerified: 'Approved / Verified',
    notProvided: 'Not provided',
    copyMemberNo: 'Copy Member No',
    goHome: 'Go to JAS Home',
    notVerifiedTitle: 'Not a Verified Member',
    notVerifiedMessage: 'This record exists, but the membership is not currently approved. Do not accept this card as active membership proof.',
    currentStatus: 'Current Status',
    failedTitle: 'Verification Failed',
    failedMessage: 'The membership record could not be verified at this time.',
    guidanceTitle: 'Verification guidance',
    guidanceMessage: 'A valid JAS card must show an approved status on this page. If the page says not found, pending, or rejected, the card should not be treated as verified.',
    jasHome: 'JAS Home',
    successCopyLink: 'Verification link copied.',
    successCopyMemberNo: 'Member number copied.',
    errorCopyLink: 'Could not copy verification link.',
    errorCopyMemberNo: 'Could not copy member number.',
    errorLoad: 'Failed to verify membership.',
    statusApproved: 'Approved',
    statusPending: 'Pending',
    statusRejected: 'Rejected',
    statusUnknown: 'Unknown',
    notAvailable: 'N/A',
    designation: 'Designation',
    designationArea: 'Designation Area',
    designationValidity: 'Designation Validity',
    designationExpiry: 'Designation Expiry',
  },
  ur: {
    loading: 'ممبرشپ تصدیق ہو رہی ہے...',
    title: 'ممبرشپ تصدیق',
    description: 'JAS ڈیجیٹل ممبرشپ کارڈز کے لیے عوامی QR تصدیقی صفحہ۔ ہمیشہ نیچے منظور شدہ اور تصدیق شدہ اسٹیٹس چیک کریں۔',
    refresh: 'اسٹیٹس تازہ کریں',
    copyLink: 'لنک کاپی کریں',
    searchedMemberNo: 'تلاش کیا گیا ممبر نمبر',
    recordStatus: 'ریکارڈ اسٹیٹس',
    verificationResult: 'تصدیقی نتیجہ',
    verified: 'تصدیق شدہ',
    notFound: 'نہیں ملا',
    approvedMember: 'منظور شدہ ممبر',
    noRecord: 'کوئی ریکارڈ نہیں',
    notApproved: 'منظور نہیں',
    notFoundTitle: 'ممبر نہیں ملا',
    notFoundMessage: 'اس ممبرشپ نمبر کے لیے کوئی JAS ممبر ریکارڈ نہیں ملا۔ کارڈ پر موجود نمبر چیک کریں یا QR کوڈ دوبارہ اسکین کریں۔',
    verifiedTitle: 'تصدیق شدہ ممبر',
    verifiedMessage: 'یہ ممبرشپ فعال ہے اور جٹ الائنس سندھ کی طرف سے تصدیق شدہ ہے۔',
    verifiedName: 'تصدیق شدہ نام',
    memberNo: 'ممبر نمبر',
    status: 'اسٹیٹس',
    district: 'ضلع',
    taluka: 'تعلقہ',
    approvedAt: 'منظوری کی تاریخ',
    verifiedBy: 'تصدیق کنندہ',
    approvedVerified: 'منظور شدہ / تصدیق شدہ',
    notProvided: 'فراہم نہیں کیا گیا',
    copyMemberNo: 'ممبر نمبر کاپی کریں',
    goHome: 'JAS ہوم پر جائیں',
    notVerifiedTitle: 'تصدیق شدہ ممبر نہیں',
    notVerifiedMessage: 'یہ ریکارڈ موجود ہے، لیکن ممبرشپ فی الحال منظور شدہ نہیں۔ اس کارڈ کو فعال ممبرشپ ثبوت نہ سمجھیں۔',
    currentStatus: 'موجودہ اسٹیٹس',
    failedTitle: 'تصدیق ناکام',
    failedMessage: 'اس وقت ممبرشپ ریکارڈ کی تصدیق نہیں ہو سکی۔',
    guidanceTitle: 'تصدیقی رہنمائی',
    guidanceMessage: 'درست JAS کارڈ پر اس صفحہ میں منظور شدہ اسٹیٹس لازمی نظر آنا چاہیے۔ اگر صفحہ not found، pending یا rejected دکھائے تو کارڈ کو تصدیق شدہ نہ سمجھیں۔',
    jasHome: 'JAS ہوم',
    successCopyLink: 'تصدیقی لنک کاپی ہو گیا۔',
    successCopyMemberNo: 'ممبر نمبر کاپی ہو گیا۔',
    errorCopyLink: 'تصدیقی لنک کاپی نہیں ہو سکا۔',
    errorCopyMemberNo: 'ممبر نمبر کاپی نہیں ہو سکا۔',
    errorLoad: 'ممبرشپ تصدیق نہیں ہو سکی۔',
    statusApproved: 'منظور شدہ',
    statusPending: 'زیرِ جائزہ',
    statusRejected: 'رد شدہ',
    statusUnknown: 'نامعلوم',
    notAvailable: 'دستیاب نہیں',
    designation: 'Designation',
    designationArea: 'Designation Area',
    designationValidity: 'Designation Validity',
    designationExpiry: 'Designation Expiry',
  },
  sd: {
    loading: 'ميمبرشپ تصديق ٿي رهي آهي...',
    title: 'ميمبرشپ تصديق',
    description: 'JAS ڊجيٽل ميمبرشپ ڪارڊن لاءِ عوامي QR تصديقي صفحو. هميشه هيٺ منظور ٿيل ۽ تصديق ٿيل اسٽيٽس چيڪ ڪريو.',
    refresh: 'اسٽيٽس تازو ڪريو',
    copyLink: 'لنڪ ڪاپي ڪريو',
    searchedMemberNo: 'تلاش ڪيل ميمبر نمبر',
    recordStatus: 'ريڪارڊ اسٽيٽس',
    verificationResult: 'تصديقي نتيجو',
    verified: 'تصديق ٿيل',
    notFound: 'نه مليو',
    approvedMember: 'منظور ٿيل ميمبر',
    noRecord: 'ڪو ريڪارڊ ناهي',
    notApproved: 'منظور ناهي',
    notFoundTitle: 'ميمبر نه مليو',
    notFoundMessage: 'هن ميمبرشپ نمبر لاءِ ڪو JAS ميمبر ريڪارڊ نه مليو. ڪارڊ تي ڇپيل نمبر چيڪ ڪريو يا QR ڪوڊ ٻيهر اسڪين ڪريو.',
    verifiedTitle: 'تصديق ٿيل ميمبر',
    verifiedMessage: 'هي ميمبرشپ فعال آهي ۽ جٽ الائنس سنڌ طرفان تصديق ٿيل آهي.',
    verifiedName: 'تصديق ٿيل نالو',
    memberNo: 'ميمبر نمبر',
    status: 'اسٽيٽس',
    district: 'ضلعو',
    taluka: 'تعلقو',
    approvedAt: 'منظوري تاريخ',
    verifiedBy: 'تصديق ڪندڙ',
    approvedVerified: 'منظور ٿيل / تصديق ٿيل',
    notProvided: 'فراهم ناهي ڪيو ويو',
    copyMemberNo: 'ميمبر نمبر ڪاپي ڪريو',
    goHome: 'JAS هوم ڏانهن وڃو',
    notVerifiedTitle: 'تصديق ٿيل ميمبر ناهي',
    notVerifiedMessage: 'هي ريڪارڊ موجود آهي، پر ميمبرشپ هن وقت منظور ٿيل ناهي. هن ڪارڊ کي فعال ميمبرشپ ثبوت طور قبول نه ڪريو.',
    currentStatus: 'موجوده اسٽيٽس',
    failedTitle: 'تصديق ناڪام',
    failedMessage: 'هن وقت ميمبرشپ ريڪارڊ جي تصديق نه ٿي سگهي.',
    guidanceTitle: 'تصديقي رهنمائي',
    guidanceMessage: 'صحيح JAS ڪارڊ تي هن صفحي ۾ منظور ٿيل اسٽيٽس لازمي ظاهر ٿيڻ گهرجي. جيڪڏهن صفحو not found، pending يا rejected ڏيکاري ته ڪارڊ کي تصديق ٿيل نه سمجھو.',
    jasHome: 'JAS هوم',
    successCopyLink: 'تصديقي لنڪ ڪاپي ٿي وئي.',
    successCopyMemberNo: 'ميمبر نمبر ڪاپي ٿي ويو.',
    errorCopyLink: 'تصديقي لنڪ ڪاپي نه ٿي سگهي.',
    errorCopyMemberNo: 'ميمبر نمبر ڪاپي نه ٿي سگهيو.',
    errorLoad: 'ميمبرشپ تصديق نه ٿي سگهي.',
    statusApproved: 'منظور ٿيل',
    statusPending: 'زيرِ جائزو',
    statusRejected: 'رد ٿيل',
    statusUnknown: 'نامعلوم',
    notAvailable: 'دستياب ناهي',
    designation: 'Designation',
    designationArea: 'Designation Area',
    designationValidity: 'Designation Validity',
    designationExpiry: 'Designation Expiry',
  },
}

type VerifyResult = {
  found: boolean
  verified: boolean
  member: {
    id: string
    member_no: string | null
    full_name: string
    district: string
    taluka: string | null
    status: MemberStatus
    approved_at: string | null
  } | null
  photoSignedUrl: string | null
  activeDesignation: {
    title: string
    committeeName: string | null
    level: string | null
    location: string | null
    validFrom: string | null
    expiresOn: string | null
    validity: string
    expiryDate: string
  } | null
}

function VerifyMemberPage() {
  const { memberNo } = Route.useParams()
  const { language } = useI18n()
  const text = verifyPageText[language] ?? verifyPageText.en

  const cooldownRef = useRef(0)
  const requestId = useRef(0)
  const inFlight = useRef(false)
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [clock, setClock] = useState(Date.now())
  useEffect(() => {
    if (!cooldownUntil) return
    const timer = setInterval(() => { const now = Date.now(); setClock(now); if (now >= cooldownUntil) setCooldownUntil(0) }, 1000)
    return () => clearInterval(timer)
  }, [cooldownUntil])
  const coolingDown = clock < cooldownUntil
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadVerification = useCallback(
    async (
      cancelledRef?: { current: boolean },
      options?: { silent?: boolean },
    ) => {
      const silent = options?.silent ?? false
      if (silent && (inFlight.current || Date.now() < cooldownRef.current)) return
      const id = ++requestId.current
      inFlight.current = true

      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')
      setSuccess('')

      try {
        const data = await verifyMemberAction({
          data: {
            memberNo,
          },
        })

        if (!cancelledRef?.current && requestId.current === id) {
          setResult(data)
        }
      } catch (err) {
        if (!cancelledRef?.current && requestId.current === id) {
          setResult(null)
          if (err instanceof Error && err.message.includes('VERIFY_RATE_LIMITED')) { cooldownRef.current = Date.now() + 60000; setCooldownUntil(cooldownRef.current) }
          setError(
            verificationErrorText(language, err instanceof Error ? err.message : ''),
          )
        }
      } finally {
        if (!cancelledRef?.current && requestId.current === id) {
          inFlight.current = false
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [memberNo, language],
  )

  useEffect(() => {
    const cancelledRef = { current: false }

    void loadVerification(cancelledRef)

    return () => {
      cancelledRef.current = true
      ++requestId.current
      inFlight.current = false
    }
  }, [loadVerification])

  async function copyVerificationLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setSuccess(text.successCopyLink)
      setError('')
    } catch {
      setError(text.errorCopyLink)
    }
  }

  async function copyMemberNo() {
    try {
      await navigator.clipboard.writeText(memberNo)
      setSuccess(text.successCopyMemberNo)
      setError('')
    } catch {
      setError(text.errorCopyMemberNo)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-3 py-6 sm:px-4 sm:py-10">
        <div className="page-wrap rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            {text.loading}
          </div>
        </div>
      </main>
    )
  }

  const verified = Boolean(result?.verified && result.member)
  const notFound = !result?.found
  const notVerified = Boolean(result?.found && !result.verified)

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-6 sm:px-4 sm:py-10">
      <div className="page-wrap space-y-5 sm:space-y-6">
        <header className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 text-center sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-700">
              Jatt Alliance Sindh
            </p>

            <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {text.title}
            </h1>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {text.description}
            </p>

            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void loadVerification(undefined, { silent: true })}
                disabled={refreshing || coolingDown}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                {text.refresh}{coolingDown ? ` (${Math.ceil((cooldownUntil - clock) / 1000)}s)` : ''}
              </button>

              <button
                type="button"
                onClick={copyVerificationLink}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <Copy className="h-4 w-4" />
                {text.copyLink}
              </button>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
            <SummaryItem
              label={text.searchedMemberNo}
              value={memberNo}
              icon={<IdCard className="h-4 w-4" />}
            />
            <SummaryItem
              label={text.recordStatus}
              value={
                verified
                  ? text.verified
                  : notFound
                    ? text.notFound
                    : getStatusLabel(result?.member?.status, text)
              }
              icon={<ShieldCheck className="h-4 w-4" />}
            />
            <SummaryItem
              label={text.verificationResult}
              value={
                verified
                  ? text.approvedMember
                  : notFound
                    ? text.noRecord
                    : text.notApproved
              }
              icon={<BadgeCheck className="h-4 w-4" />}
            />
          </div>
        </header>

        {error ? (
          <AlertBox tone="error" icon={<AlertCircle className="h-5 w-5" />}>
            {error}
          </AlertBox>
        ) : null}

        {success ? (
          <AlertBox tone="success" icon={<CheckCircle2 className="h-5 w-5" />}>
            {success}
          </AlertBox>
        ) : null}

        {notFound ? (
          <VerificationState
            tone="danger"
            icon={<XCircle className="h-10 w-10" />}
            title={text.notFoundTitle}
            message={text.notFoundMessage}
          >
            <div className="mx-auto mt-5 max-w-md rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-slate-100">
              <Info label={text.searchedMemberNo} value={memberNo} />
            </div>
          </VerificationState>
        ) : verified && result?.member ? (
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-950 p-6 text-center text-white sm:p-8">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20">
                <CheckCircle2 className="h-11 w-11" />
              </div>

              <h2 className="mt-5 text-2xl font-black sm:text-4xl">
                {text.verifiedTitle}
              </h2>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-emerald-50">
                {text.verifiedMessage}
              </p>
            </div>

            <div className="p-5 sm:p-8">
              <div className="flex flex-col items-center gap-6 text-center">
                {result.photoSignedUrl ? (
                  <img
                    src={result.photoSignedUrl}
                    alt={`${result.member.full_name} profile photo`}
                    className="h-36 w-36 rounded-3xl object-cover object-top shadow-sm ring-1 ring-slate-200"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 ring-1 ring-slate-200">
                    <User className="h-12 w-12" />
                  </div>
                )}

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                    {text.verifiedName}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
                    {result.member.full_name}
                  </h3>
                </div>

                <div className="grid w-full max-w-3xl gap-4 rounded-3xl bg-slate-50 p-5 text-left ring-1 ring-slate-100 md:grid-cols-2">
                  <Info
                    label={text.memberNo}
                    value={result.member.member_no ?? text.notAvailable}
                  />
                  <Info label={text.status} value={text.approvedVerified} />
                  {result.activeDesignation ? (
                    <>
                      <Info
                        label={text.designation}
                        value={result.activeDesignation.title}
                      />
                      <Info
                        label={text.designationArea}
                        value={[
                          result.activeDesignation.level,
                          result.activeDesignation.location,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      />
                      <Info
                        label={text.designationValidity}
                        value={result.activeDesignation.validity}
                      />
                      <Info
                        label={text.designationExpiry}
                        value={result.activeDesignation.expiryDate}
                      />
                    </>
                  ) : null}
                  <Info label={text.district} value={result.member.district} />
                  <Info
                    label={text.taluka}
                    value={result.member.taluka || text.notProvided}
                  />
                  <Info
                    label={text.approvedAt}
                    value={formatDate(result.member.approved_at)}
                  />
                  <Info label={text.verifiedBy} value="Jatt Alliance Sindh" />
                </div>

                <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={copyMemberNo}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
                  >
                    <Copy className="h-4 w-4" />
                    {text.copyMemberNo}
                  </button>

                  <Link
                    to="/"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold !text-white no-underline shadow-sm transition hover:bg-slate-800 hover:!text-white"
                    style={{ color: '#ffffff' }}
                  >
                    <Home className="h-4 w-4" />
                    {text.goHome}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : notVerified ? (
          <VerificationState
            tone="warning"
            icon={<ShieldAlert className="h-10 w-10" />}
            title={text.notVerifiedTitle}
            message={text.notVerifiedMessage}
          >
            <div className="mx-auto mt-5 max-w-md rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-slate-100">
              <Info label={text.memberNo} value={memberNo} />
              <Info
                label={text.currentStatus}
                value={getStatusLabel(result?.member?.status, text)}
              />
            </div>
          </VerificationState>
        ) : (
          <VerificationState
            tone="danger"
            icon={<XCircle className="h-10 w-10" />}
            title={text.failedTitle}
            message={text.failedMessage}
          />
        )}

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 sm:p-6">
          <div className="grid gap-4 md:grid-cols-[48px_1fr_auto] md:items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
              <ExternalLink className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-black text-slate-950">
                {text.guidanceTitle}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {text.guidanceMessage}
              </p>
            </div>

            <Link
              to="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 no-underline shadow-sm transition hover:bg-slate-50"
            >
              <Home className="h-4 w-4" />
              {text.jasHome}
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}

function VerificationState({
  tone,
  icon,
  title,
  message,
  children,
}: {
  tone: 'danger' | 'warning'
  icon: ReactNode
  title: string
  message: string
  children?: ReactNode
}) {
  const config = {
    danger: {
      wrapper: 'from-red-50 via-white to-red-50',
      icon: 'bg-red-50 text-red-700 ring-red-100',
      title: 'text-red-900',
    },
    warning: {
      wrapper: 'from-amber-50 via-white to-amber-50',
      icon: 'bg-amber-50 text-amber-700 ring-amber-100',
      title: 'text-amber-900',
    },
  }[tone]

  return (
    <section
      className={`rounded-3xl bg-gradient-to-br ${config.wrapper} p-6 text-center shadow-sm ring-1 ring-slate-200/70 sm:p-8`}
    >
      <div
        className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ring-1 ${config.icon}`}
      >
        {icon}
      </div>

      <h2 className={`mt-5 text-xl font-black sm:text-3xl ${config.title}`}>
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {message}
      </p>

      {children}
    </section>
  )
}

function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-black text-slate-950">
            {value}
          </p>
        </div>

        <span className="text-emerald-700">{icon}</span>
      </div>
    </div>
  )
}

function AlertBox({
  tone,
  icon,
  children,
}: {
  tone: 'error' | 'success'
  icon: ReactNode
  children: ReactNode
}) {
  const classes =
    tone === 'error'
      ? 'bg-red-50 text-red-700 ring-red-100'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-100'

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl p-4 text-sm font-medium ring-1 ${classes}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">
        {value || 'N/A'}
      </p>
    </div>
  )
}

function formatDate(value: string | null) {
  if (!value) return 'N/A'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'N/A'

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusLabel(status: MemberStatus | undefined, text: VerifyPageText) {
  switch (status) {
    case 'approved':
      return text.statusApproved
    case 'pending':
      return text.statusPending
    case 'rejected':
      return text.statusRejected
    default:
      return text.statusUnknown
  }
}