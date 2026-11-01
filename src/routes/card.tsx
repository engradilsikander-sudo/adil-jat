// src/routes/card.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  ImageOff,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  MembershipCard,
  type CardSide,
  type MembershipCardMember,
} from '../components/MembershipCard'
import { supabase } from '../lib/supabase/client'
import { useI18n, type AppLanguage } from '../lib/i18n'
import { exportElementAsPng } from '../lib/shared/card-export'
import { generateQrDataUrl } from '../lib/shared/qrcode'
import { fetchActiveMemberCardDesignation } from '../lib/member-card-designation'
import { PUBLIC_SITE_ORIGIN } from '../lib/member-card-config'

export const Route = createFileRoute('/card')({
  component: CardPage,
})

const JAS_LOGO_PATH = '/jas/logo.jpeg'
const JAS_FLAG_PATH = '/jas/flag.jpeg'
const MEMBER_PHOTO_BUCKET = 'member-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60
const PUBLIC_VERIFY_ORIGIN = PUBLIC_SITE_ORIGIN


type CardPageText = {
  loading: string
  backDashboard: string
  eyebrow: string
  title: string
  description: string
  refresh: string
  summaryMember: string
  summaryStatus: string
  summaryMemberNo: string
  summaryCardState: string
  notIssued: string
  ready: string
  notAvailable: string
  formNotFoundTitle: string
  formNotFoundMessage: string
  completeRegistration: string
  swipeHint: string
  cardReadyTitle: string
  cardReadyMessage: string
  verificationLink: string
  copyLink: string
  openVerification: string
  downloadCard: string
  downloadGuidance: string
  downloadFront: string
  downloadBack: string
  downloadBoth: string
  downloading: string
  downloadingBoth: string
  sideFront: string
  sideBack: string
  statusApproved: string
  statusRejected: string
  statusPending: string
  updateResubmit: string
  successFront: string
  successBack: string
  successBoth: string
  successCopyLink: string
  errorCopyLink: string
  errorLoad: string
  errorMemberNoUnavailable: string
  errorPrepareDownload: string
  errorDownloadSide: string
  errorDownloadBoth: string
  rejectedTitle: string
  rejectedMessage: string
  noNumberTitle: string
  noNumberMessage: string
  pendingTitle: string
  pendingMessage: string
}

const cardPageText: Record<AppLanguage, CardPageText> = {
  en: {
    loading: 'Loading digital card...',
    backDashboard: 'Back to Dashboard',
    eyebrow: 'Digital Member ID',
    title: 'Digital Membership Card',
    description: 'Preview, verify and download your official Jatt Alliance Sindh digital membership card.',
    refresh: 'Refresh',
    summaryMember: 'Member',
    summaryStatus: 'Status',
    summaryMemberNo: 'Member No',
    summaryCardState: 'Card State',
    notIssued: 'Not issued',
    ready: 'Ready',
    notAvailable: 'Not available',
    formNotFoundTitle: 'Membership form not found',
    formNotFoundMessage: 'Please complete your membership registration form first. Your card will be available after admin approval.',
    completeRegistration: 'Complete Registration',
    swipeHint: 'Card preview auto-fits your screen.',
    cardReadyTitle: 'Your card is ready',
    cardReadyMessage: 'Your membership is approved. The QR code opens your public verification page.',
    verificationLink: 'Verification Link',
    copyLink: 'Copy Link',
    openVerification: 'Open Verification',
    downloadCard: 'Download Card',
    downloadGuidance: 'Use front/back PNG downloads for printing or sharing. The official card design remains unchanged.',
    downloadFront: 'Download Front PNG',
    downloadBack: 'Download Back PNG',
    downloadBoth: 'Download Both Sides',
    downloading: 'Downloading...',
    downloadingBoth: 'Downloading both...',
    sideFront: 'Front',
    sideBack: 'Back',
    statusApproved: 'Approved',
    statusRejected: 'Rejected',
    statusPending: 'Pending',
    updateResubmit: 'Update & Resubmit',
    successFront: 'Front side downloaded successfully.',
    successBack: 'Back side downloaded successfully.',
    successBoth: 'Front and back sides downloaded successfully.',
    successCopyLink: 'Verification link copied.',
    errorCopyLink: 'Could not copy verification link.',
    errorLoad: 'Failed to load digital membership card.',
    errorMemberNoUnavailable: 'Member number is not available.',
    errorPrepareDownload: 'Unable to prepare {side} side for download.',
    errorDownloadSide: 'Failed to download {side} side. Please try again.',
    errorDownloadBoth: 'Failed to download both card sides. Please try again.',
    rejectedTitle: 'Application needs correction',
    rejectedMessage: 'Your application was rejected. Please update your membership form and resubmit it for admin review.',
    noNumberTitle: 'Member number not issued yet',
    noNumberMessage: 'Your application is approved, but the member number is not available yet. The card will appear after number issuance.',
    pendingTitle: 'Digital card is not available yet',
    pendingMessage: 'Your membership application is still under admin review. Your digital card will be available after approval.',
  },
  ur: {
    loading: 'ڈیجیٹل کارڈ لوڈ ہو رہا ہے...',
    backDashboard: 'ڈیش بورڈ پر واپس',
    eyebrow: 'ڈیجیٹل ممبر آئی ڈی',
    title: 'ڈیجیٹل ممبرشپ کارڈ',
    description: 'اپنا سرکاری جٹ الائنس سندھ ڈیجیٹل ممبرشپ کارڈ دیکھیں، تصدیق کریں اور ڈاؤن لوڈ کریں۔',
    refresh: 'تازہ کریں',
    summaryMember: 'ممبر',
    summaryStatus: 'اسٹیٹس',
    summaryMemberNo: 'ممبر نمبر',
    summaryCardState: 'کارڈ حالت',
    notIssued: 'جاری نہیں ہوا',
    ready: 'تیار',
    notAvailable: 'دستیاب نہیں',
    formNotFoundTitle: 'ممبرشپ فارم نہیں ملا',
    formNotFoundMessage: 'براہِ کرم پہلے ممبرشپ رجسٹریشن فارم مکمل کریں۔ ایڈمن منظوری کے بعد کارڈ دستیاب ہوگا۔',
    completeRegistration: 'رجسٹریشن مکمل کریں',
    swipeHint: 'کارڈ پری ویو خود بخود آپ کی اسکرین میں فٹ ہو جاتا ہے۔',
    cardReadyTitle: 'آپ کا کارڈ تیار ہے',
    cardReadyMessage: 'آپ کی ممبرشپ منظور ہو چکی ہے۔ QR کوڈ آپ کا عوامی تصدیقی صفحہ کھولتا ہے۔',
    verificationLink: 'تصدیقی لنک',
    copyLink: 'لنک کاپی کریں',
    openVerification: 'تصدیق کھولیں',
    downloadCard: 'کارڈ ڈاؤن لوڈ کریں',
    downloadGuidance: 'پرنٹنگ یا شیئرنگ کے لیے فرنٹ/بیک PNG ڈاؤن لوڈ استعمال کریں۔ سرکاری کارڈ ڈیزائن تبدیل نہیں کیا گیا۔',
    downloadFront: 'فرنٹ PNG ڈاؤن لوڈ کریں',
    downloadBack: 'بیک PNG ڈاؤن لوڈ کریں',
    downloadBoth: 'دونوں سائیڈز ڈاؤن لوڈ کریں',
    downloading: 'ڈاؤن لوڈ ہو رہا ہے...',
    downloadingBoth: 'دونوں ڈاؤن لوڈ ہو رہے ہیں...',
    sideFront: 'فرنٹ',
    sideBack: 'بیک',
    statusApproved: 'منظور شدہ',
    statusRejected: 'رد شدہ',
    statusPending: 'زیرِ جائزہ',
    updateResubmit: 'اپڈیٹ کر کے دوبارہ جمع کریں',
    successFront: 'فرنٹ سائیڈ کامیابی سے ڈاؤن لوڈ ہو گئی۔',
    successBack: 'بیک سائیڈ کامیابی سے ڈاؤن لوڈ ہو گئی۔',
    successBoth: 'فرنٹ اور بیک دونوں سائیڈز کامیابی سے ڈاؤن لوڈ ہو گئیں۔',
    successCopyLink: 'تصدیقی لنک کاپی ہو گیا۔',
    errorCopyLink: 'تصدیقی لنک کاپی نہیں ہو سکا۔',
    errorLoad: 'ڈیجیٹل ممبرشپ کارڈ لوڈ نہیں ہو سکا۔',
    errorMemberNoUnavailable: 'ممبر نمبر دستیاب نہیں۔',
    errorPrepareDownload: '{side} سائیڈ ڈاؤن لوڈ کے لیے تیار نہیں ہو سکی۔',
    errorDownloadSide: '{side} سائیڈ ڈاؤن لوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں۔',
    errorDownloadBoth: 'دونوں کارڈ سائیڈز ڈاؤن لوڈ نہیں ہو سکیں۔ دوبارہ کوشش کریں۔',
    rejectedTitle: 'درخواست میں درستگی ضروری ہے',
    rejectedMessage: 'آپ کی درخواست رد ہو چکی ہے۔ فارم اپڈیٹ کر کے دوبارہ ایڈمن جائزے کے لیے جمع کرائیں۔',
    noNumberTitle: 'ممبر نمبر ابھی جاری نہیں ہوا',
    noNumberMessage: 'آپ کی درخواست منظور ہے، لیکن ممبر نمبر ابھی دستیاب نہیں۔ نمبر جاری ہونے کے بعد کارڈ ظاہر ہوگا۔',
    pendingTitle: 'ڈیجیٹل کارڈ ابھی دستیاب نہیں',
    pendingMessage: 'آپ کی ممبرشپ درخواست ابھی ایڈمن جائزے میں ہے۔ منظوری کے بعد ڈیجیٹل کارڈ دستیاب ہوگا۔',
  },
  sd: {
    loading: 'ڊجيٽل ڪارڊ لوڊ ٿي رهيو آهي...',
    backDashboard: 'ڊيش بورڊ ڏانهن واپس',
    eyebrow: 'ڊجيٽل ميمبر آءِ ڊي',
    title: 'ڊجيٽل ميمبرشپ ڪارڊ',
    description: 'پنهنجو سرڪاري جٽ الائنس سنڌ ڊجيٽل ميمبرشپ ڪارڊ ڏسو، تصديق ڪريو ۽ ڊائون لوڊ ڪريو.',
    refresh: 'تازو ڪريو',
    summaryMember: 'ميمبر',
    summaryStatus: 'اسٽيٽس',
    summaryMemberNo: 'ميمبر نمبر',
    summaryCardState: 'ڪارڊ حالت',
    notIssued: 'جاري ناهي ٿيو',
    ready: 'تيار',
    notAvailable: 'دستياب ناهي',
    formNotFoundTitle: 'ميمبرشپ فارم نه مليو',
    formNotFoundMessage: 'مهرباني ڪري پهرين ميمبرشپ رجسٽريشن فارم مڪمل ڪريو. ايڊمن منظوري کان پوءِ ڪارڊ دستياب ٿيندو.',
    completeRegistration: 'رجسٽريشن مڪمل ڪريو',
    swipeHint: 'ڪارڊ پريويو پاڻمرادو توهان جي اسڪرين ۾ فٽ ٿي ويندو.',
    cardReadyTitle: 'توهان جو ڪارڊ تيار آهي',
    cardReadyMessage: 'توهان جي ميمبرشپ منظور ٿي چڪي آهي. QR ڪوڊ عوامي تصديقي صفحو کولي ٿو.',
    verificationLink: 'تصديقي لنڪ',
    copyLink: 'لنڪ ڪاپي ڪريو',
    openVerification: 'تصديق کوليو',
    downloadCard: 'ڪارڊ ڊائون لوڊ ڪريو',
    downloadGuidance: 'پرنٽنگ يا شيئرنگ لاءِ فرنٽ/بئڪ PNG ڊائون لوڊ استعمال ڪريو. سرڪاري ڪارڊ ڊيزائن تبديل ناهي ڪيو ويو.',
    downloadFront: 'فرنٽ PNG ڊائون لوڊ ڪريو',
    downloadBack: 'بئڪ PNG ڊائون لوڊ ڪريو',
    downloadBoth: 'ٻئي پاسا ڊائون لوڊ ڪريو',
    downloading: 'ڊائون لوڊ ٿي رهيو آهي...',
    downloadingBoth: 'ٻئي ڊائون لوڊ ٿي رهيا آهن...',
    sideFront: 'فرنٽ',
    sideBack: 'بئڪ',
    statusApproved: 'منظور ٿيل',
    statusRejected: 'رد ٿيل',
    statusPending: 'زيرِ جائزو',
    updateResubmit: 'اپڊيٽ ڪري ٻيهر جمع ڪريو',
    successFront: 'فرنٽ پاسو ڪاميابي سان ڊائون لوڊ ٿيو.',
    successBack: 'بئڪ پاسو ڪاميابي سان ڊائون لوڊ ٿيو.',
    successBoth: 'فرنٽ ۽ بئڪ ٻئي پاسا ڪاميابي سان ڊائون لوڊ ٿيا.',
    successCopyLink: 'تصديقي لنڪ ڪاپي ٿي وئي.',
    errorCopyLink: 'تصديقي لنڪ ڪاپي نه ٿي سگهي.',
    errorLoad: 'ڊجيٽل ميمبرشپ ڪارڊ لوڊ نه ٿي سگهيو.',
    errorMemberNoUnavailable: 'ميمبر نمبر دستياب ناهي.',
    errorPrepareDownload: '{side} پاسو ڊائون لوڊ لاءِ تيار نه ٿي سگهيو.',
    errorDownloadSide: '{side} پاسو ڊائون لوڊ نه ٿي سگهيو. ٻيهر ڪوشش ڪريو.',
    errorDownloadBoth: 'ٻئي ڪارڊ پاسا ڊائون لوڊ نه ٿي سگهيا. ٻيهر ڪوشش ڪريو.',
    rejectedTitle: 'درخواست ۾ درستگي ضروري آهي',
    rejectedMessage: 'توهان جي درخواست رد ٿي چڪي آهي. فارم اپڊيٽ ڪري ٻيهر ايڊمن جائزي لاءِ جمع ڪرايو.',
    noNumberTitle: 'ميمبر نمبر اڃا جاري ناهي ٿيو',
    noNumberMessage: 'توهان جي درخواست منظور آهي، پر ميمبر نمبر اڃا دستياب ناهي. نمبر جاري ٿيڻ کان پوءِ ڪارڊ ظاهر ٿيندو.',
    pendingTitle: 'ڊجيٽل ڪارڊ اڃا دستياب ناهي',
    pendingMessage: 'توهان جي ميمبرشپ درخواست اڃا ايڊمن جائزي هيٺ آهي. منظوري کان پوءِ ڊجيٽل ڪارڊ دستياب ٿيندو.',
  },
}


type DownloadTarget = CardSide | 'both' | null

function CardPage() {
  const navigate = useNavigate()
  const { language } = useI18n()
  const text = cardPageText[language] ?? cardPageText.en

  const visibleStageRef = useRef<HTMLDivElement>(null)
  const frontExportRef = useRef<HTMLDivElement>(null)
  const backExportRef = useRef<HTMLDivElement>(null)

  const [cardScale, setCardScale] = useState(1)
  const [selectedSide, setSelectedSide] = useState<CardSide>('front')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [downloadingTarget, setDownloadingTarget] =
    useState<DownloadTarget>(null)

  const [member, setMember] = useState<MembershipCardMember | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [flagUrl, setFlagUrl] = useState<string | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [verifyUrl, setVerifyUrl] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const cardReady = Boolean(
    member?.status === 'approved' && member.member_no && qrUrl && verifyUrl,
  )

  const loadCard = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false

      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      setError('')
      setSuccess('')

      if (!silent) {
        setMember(null)
        setPhotoUrl(null)
        setQrUrl(null)
        setVerifyUrl('')
      }

      try {
        const [logoDataUrl, flagDataUrl] = await Promise.all([
          imageUrlToDataUrl(JAS_LOGO_PATH),
          imageUrlToDataUrl(JAS_FLAG_PATH),
        ])

        setLogoUrl(logoDataUrl || JAS_LOGO_PATH)
        setFlagUrl(flagDataUrl || JAS_FLAG_PATH)

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          await navigate({ to: '/login' })
          return
        }

        const data = await fetchCurrentMember(user.id)

        if (!data) {
          setMember(null)
          setError(text.formNotFoundMessage)
          return
        }

        const activeDesignation = await fetchActiveMemberCardDesignation(data.id)
        const memberWithDesignation = {
          ...data,
          activeDesignation,
        }

        setMember(memberWithDesignation)

        if (data.status !== 'approved' || !data.member_no) {
          setPhotoUrl(null)
          setQrUrl(null)
          setVerifyUrl('')
          return
        }

        const publicVerifyUrl = buildPublicVerifyUrl(data.member_no)

        const generatedQr = await generateQrDataUrl(publicVerifyUrl, {
          width: 320,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#111827',
            light: '#ffffff',
          },
        })

        setVerifyUrl(publicVerifyUrl)
        setQrUrl(generatedQr)

        if (data.photo_url) {
          const { data: signed, error: signedError } = await supabase.storage
            .from(MEMBER_PHOTO_BUCKET)
            .createSignedUrl(data.photo_url, SIGNED_URL_TTL_SECONDS)

          if (!signedError && signed?.signedUrl) {
            const dataUrl = await imageUrlToDataUrl(signed.signedUrl)
            setPhotoUrl(dataUrl || signed.signedUrl)
          } else {
            setPhotoUrl(null)
          }
        } else {
          setPhotoUrl(null)
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : text.errorLoad,
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [navigate, text.errorLoad, text.formNotFoundMessage],
  )

  useEffect(() => {
    void loadCard()
  }, [loadCard])

  useEffect(() => {
    const updateScale = () => {
      const stageWidth = visibleStageRef.current?.clientWidth || CARD_WIDTH
      const availableWidth = Math.max(220, stageWidth)
      const nextScale = Math.min(1, Math.max(0.2, availableWidth / CARD_WIDTH))

      setCardScale(Number(nextScale.toFixed(4)))
    }

    updateScale()

    const node = visibleStageRef.current
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateScale)
        : null

    if (node && resizeObserver) {
      resizeObserver.observe(node)
    }

    window.addEventListener('resize', updateScale)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [])

  async function exportCardToPng(side: CardSide) {
    if (!member?.member_no) {
      throw new Error(text.errorMemberNoUnavailable)
    }

    const targetRef = side === 'front' ? frontExportRef : backExportRef

    if (!targetRef.current) {
      throw new Error(text.errorPrepareDownload.replace('{side}', getCardSideText(side, text)))
    }

    await exportElementAsPng(
      targetRef.current,
      `${member.member_no}-JAS-card-${side}.png`,
      {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        canvasWidth: CARD_WIDTH * 2.5,
        canvasHeight: CARD_HEIGHT * 2.5,
      },
    )
  }

  async function handleDownload(side: CardSide) {
    setDownloadingTarget(side)
    setError('')
    setSuccess('')

    try {
      await exportCardToPng(side)
      setSuccess(side === 'front' ? text.successFront : text.successBack)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : text.errorDownloadSide.replace('{side}', getCardSideText(side, text)),
      )
    } finally {
      setDownloadingTarget(null)
    }
  }

  async function handleDownloadBoth() {
    setDownloadingTarget('both')
    setError('')
    setSuccess('')

    try {
      await exportCardToPng('front')
      await wait(350)
      await exportCardToPng('back')
      setSuccess(text.successBoth)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : text.errorDownloadBoth,
      )
    } finally {
      setDownloadingTarget(null)
    }
  }

  async function copyVerifyUrl() {
    if (!verifyUrl) return

    try {
      await navigator.clipboard.writeText(verifyUrl)
      setSuccess(text.successCopyLink)
      setError('')
    } catch {
      setError(text.errorCopyLink)
    }
  }

  if (loading) {
    return (
      <main className="card-page-shell px-3 py-6 sm:px-4 sm:py-10">
        <div className="page-wrap rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            {text.loading}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="card-page-shell px-3 py-6 sm:px-4 sm:py-10">
      <div className="card-page-wrap page-wrap space-y-5 sm:space-y-6">
        <header className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 sm:p-7">
            <BackToDashboard />

            <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                  {text.eyebrow}
                </p>

                <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {text.title}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {text.description}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:flex">
                <button
                  type="button"
                  onClick={() => void loadCard({ silent: true })}
                  disabled={refreshing || downloadingTarget !== null}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                  />
                  {text.refresh}
                </button>

                {cardReady ? (
                  <CardSideToggle
                    selectedSide={selectedSide}
                    onSelect={setSelectedSide}
                    text={text}
                  />
                ) : null}
              </div>
            </div>
          </div>

          {member ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
              <SummaryItem
                label={text.summaryMember}
                value={member.full_name}
                icon={<UserCardIcon />}
              />
              <SummaryItem
                label={text.summaryStatus}
                value={getStatusLabel(member.status, text)}
                icon={<ShieldCheck className="h-4 w-4" />}
              />
              <SummaryItem
                label={text.summaryMemberNo}
                value={member.member_no || text.notIssued}
                icon={<CreditCard className="h-4 w-4" />}
              />
              <SummaryItem
                label={text.summaryCardState}
                value={cardReady ? text.ready : text.notAvailable}
                icon={<BadgeCheck className="h-4 w-4" />}
              />
            </div>
          ) : null}
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

        {!member ? (
          <EmptyCardState
            title={text.formNotFoundTitle}
            message={text.formNotFoundMessage}
            action={
              <Link
                to="/register"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold !text-white no-underline shadow-sm transition hover:bg-slate-800 hover:!text-white"
                style={{ color: '#ffffff' }}
              >
                {text.completeRegistration}
              </Link>
            }
          />
        ) : cardReady ? (
          <>
            <section className="card-preview-layout grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div className="card-visible-panel rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
                <p className="mb-3 text-center text-xs font-semibold text-slate-500 sm:hidden">
                  {text.swipeHint}
                </p>

                <div ref={visibleStageRef} className="card-scroll-stage w-full overflow-hidden pb-2">
                  <ScaledCardShell scale={cardScale}>
                    <MembershipCard
                      side={selectedSide}
                      member={member}
                      photoUrl={photoUrl}
                      logoUrl={logoUrl}
                      flagUrl={flagUrl}
                      qrUrl={qrUrl}
                      verifyUrl={verifyUrl}
                    />
                  </ScaledCardShell>
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700 ring-1 ring-emerald-100">
                      <BadgeCheck className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-base font-black text-slate-950">
                        {text.cardReadyTitle}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {text.cardReadyMessage}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {text.verificationLink}
                  </p>

                  <p className="mt-2 break-all rounded-2xl bg-slate-50 p-3 font-mono text-xs font-semibold text-slate-700 ring-1 ring-slate-100">
                    {formatVerifyUrlForDisplay(verifyUrl)}
                  </p>

                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={copyVerifyUrl}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
                    >
                      <Copy className="h-4 w-4" />
                      {text.copyLink}
                    </button>

                    <Link
                      to="/verify/$memberNo"
                      params={{ memberNo: member.member_no ?? '' }}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 no-underline shadow-sm transition hover:bg-emerald-100"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {text.openVerification}
                    </Link>
                  </div>
                </div>

                <div className="card-download-panel rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {text.downloadCard}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-500">{text.downloadGuidance}</p>

                  <div className="card-download-actions mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDownload('front')}
                      disabled={downloadingTarget !== null}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {downloadingTarget === 'front' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {downloadingTarget === 'front'
                        ? text.downloading
                        : text.downloadFront}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDownload('back')}
                      disabled={downloadingTarget !== null}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ color: '#ffffff' }}
                    >
                      {downloadingTarget === 'back' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {downloadingTarget === 'back'
                        ? text.downloading
                        : text.downloadBack}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDownloadBoth()}
                      disabled={downloadingTarget !== null}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2 text-sm font-black text-slate-950 shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {downloadingTarget === 'both' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {downloadingTarget === 'both'
                        ? text.downloadingBoth
                        : text.downloadBoth}
                    </button>
                  </div>
                </div>
              </aside>
            </section>

            <ExportCards
              member={member}
              photoUrl={photoUrl}
              logoUrl={logoUrl}
              flagUrl={flagUrl}
              qrUrl={qrUrl}
              verifyUrl={verifyUrl}
              frontRef={frontExportRef}
              backRef={backExportRef}
            />
          </>
        ) : (
          <EmptyCardState
            title={getUnavailableTitle(member, text)}
            message={getUnavailableMessage(member, text)}
            action={
              member.status === 'rejected' ? (
                <Link
                  to="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-black text-slate-950 no-underline shadow-sm transition hover:bg-amber-300"
                >
                  {text.updateResubmit}
                </Link>
              ) : (
                <Link
                  to="/dashboard"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold !text-white no-underline shadow-sm transition hover:bg-slate-800 hover:!text-white"
                  style={{ color: '#ffffff' }}
                >
                  {text.backDashboard}
                </Link>
              )
            }
          />
        )}
      </div>
    </main>
  )
}

function BackToDashboard() {
  const { language } = useI18n()
  const text = cardPageText[language] ?? cardPageText.en

  return (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 no-underline hover:text-emerald-800"
    >
      <ArrowLeft className="h-4 w-4" />
      {text.backDashboard}
    </Link>
  )
}

function CardSideToggle({
  selectedSide,
  onSelect,
  text,
}: {
  selectedSide: CardSide
  onSelect: (side: CardSide) => void
  text: CardPageText
}) {
  const labels: Record<CardSide, string> = {
    front: text.sideFront,
    back: text.sideBack,
  }

  return (
    <div className="inline-flex h-11 rounded-xl border border-slate-200 bg-slate-100 p-1">
      {(['front', 'back'] as const).map((side) => (
        <button
          key={side}
          type="button"
          onClick={() => onSelect(side)}
          className={`rounded-lg px-4 py-2 text-sm font-bold capitalize transition ${
            selectedSide === side
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          {labels[side]}
        </button>
      ))}
    </div>
  )
}

function ScaledCardShell({
  scale,
  children,
}: {
  scale: number
  children: ReactNode
}) {
  return (
    <div
      className="mx-auto"
      style={{
        width: `${CARD_WIDTH * scale}px`,
        height: `${CARD_HEIGHT * scale}px`,
      }}
    >
      <div
        style={{
          width: `${CARD_WIDTH}px`,
          height: `${CARD_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function ExportCards({
  member,
  photoUrl,
  logoUrl,
  flagUrl,
  qrUrl,
  verifyUrl,
  frontRef,
  backRef,
}: {
  member: MembershipCardMember
  photoUrl: string | null
  logoUrl: string | null
  flagUrl: string | null
  qrUrl: string | null
  verifyUrl: string
  frontRef: RefObject<HTMLDivElement | null>
  backRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      className="pointer-events-none fixed left-[-10000px] top-0"
      aria-hidden="true"
    >
      <div ref={frontRef}>
        <MembershipCard
          side="front"
          member={member}
          photoUrl={photoUrl}
          logoUrl={logoUrl}
          flagUrl={flagUrl}
          qrUrl={qrUrl}
          verifyUrl={verifyUrl}
        />
      </div>

      <div ref={backRef}>
        <MembershipCard
          side="back"
          member={member}
          photoUrl={photoUrl}
          logoUrl={logoUrl}
          flagUrl={flagUrl}
          qrUrl={qrUrl}
          verifyUrl={verifyUrl}
        />
      </div>
    </div>
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

function EmptyCardState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action: ReactNode
}) {
  return (
    <section className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200/70 sm:p-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
        <ImageOff className="h-7 w-7" />
      </div>

      <h2 className="mt-5 text-xl font-black text-slate-950">{title}</h2>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {message}
      </p>

      <div className="mt-6 flex justify-center">{action}</div>
    </section>
  )
}

function UserCardIcon() {
  return <QrCode className="h-4 w-4" />
}

async function fetchCurrentMember(userId: string) {
  const { data, error } = await supabase
    .from('members')
    .select(
      [
        'id',
        'member_no',
        'full_name',
        'father_name',
        'cnic',
        'mobile',
        'district',
        'taluka',
        'profession',
        'caste_branch',
        'photo_url',
        'status',
        'approved_at',
        'address',
        'date_of_birth',
        'gender',
        'education',
        'blood_group',
        'emergency_contact_name',
        'emergency_contact_relation',
        'emergency_contact_mobile',
        'declaration_accepted',
      ].join(', '),
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  return data as unknown as MembershipCardMember | null
}

async function imageUrlToDataUrl(url: string) {
  try {
    const response = await fetch(url)

    if (!response.ok) return null

    const blob = await response.blob()

    return await new Promise<string | null>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function getStatusLabel(status: string, text: CardPageText) {
  switch (status) {
    case 'approved':
      return text.statusApproved
    case 'rejected':
      return text.statusRejected
    default:
      return text.statusPending
  }
}

function getUnavailableTitle(member: MembershipCardMember, text: CardPageText) {
  if (member.status === 'rejected') return text.rejectedTitle
  if (member.status === 'approved' && !member.member_no) return text.noNumberTitle
  return text.pendingTitle
}

function getUnavailableMessage(member: MembershipCardMember, text: CardPageText) {
  if (member.status === 'rejected') return text.rejectedMessage
  if (member.status === 'approved' && !member.member_no) return text.noNumberMessage
  return text.pendingMessage
}

function getCardSideText(side: CardSide, text: CardPageText) {
  return side === 'front' ? text.sideFront : text.sideBack
}


function buildPublicVerifyUrl(memberNo: string) {
  return `${PUBLIC_VERIFY_ORIGIN}/verify/${encodeURIComponent(memberNo)}`
}

function formatVerifyUrlForDisplay(value: string) {
  if (!value) return ''

  try {
    const url = new URL(value)
    return `${url.host}${url.pathname}`
  } catch {
    return value.replace(/^https?:\/\//, '')
  }
}


function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}