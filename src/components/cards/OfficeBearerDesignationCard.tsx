import {
  BadgeCheck,
  CalendarDays,
  Copy,
  Download,
  ExternalLink,
  Landmark,
  MapPin,
  QrCode,
  ShieldCheck,
} from 'lucide-react'
import { forwardRef, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  buildOfficeBearerId,
  formatOfficeBearerDisplayText,
  getCommitteeLocation,
  getCommitteeTypeLabel,
  getInitials,
  getOfficeBearerVerificationUrl,
  type DesignationCardRecord,
} from '../../lib/committees-public'
import { formatDesignationExpiry, formatDesignationValidity } from '../../lib/designation-validity'
import { exportElementAsPng } from '../../lib/shared/card-export'
import { generateQrDataUrl } from '../../lib/shared/qrcode'

const JAS_LOGO_PATH = '/jas/logo.jpeg'
const JAS_SIGNATURE_PATH = '/jas/signature.png'
const OFFICE_CARD_WIDTH = 1012
const OFFICE_CARD_HEIGHT = 638

type CardSide = 'front' | 'back'

export function OfficeBearerCardPackage({
  card,
  adminPreview = false,
}: {
  card: DesignationCardRecord
  adminPreview?: boolean
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const frontExportRef = useRef<HTMLDivElement>(null)
  const backExportRef = useRef<HTMLDivElement>(null)
  const [cardScale, setCardScale] = useState(1)
  const [selectedSide, setSelectedSide] = useState<CardSide>('front')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [downloading, setDownloading] = useState<CardSide | 'both' | null>(null)
  const [downloadError, setDownloadError] = useState('')
  const [copied, setCopied] = useState(false)

  const verificationUrl = useMemo(() => buildVerificationUrl(card), [card])
  const officeBearerId = useMemo(() => buildOfficeBearerId(card), [card])
  const displayDesignation = formatOfficeBearerDisplayText(card.designation_title)
  const displayMemberName = formatOfficeBearerDisplayText(card.member.full_name || card.full_name_snapshot)
  const cardTitle = adminPreview ? 'Admin office bearer card preview' : 'My office bearer card'
  const downloadDisabled = Boolean(downloading) || !qrDataUrl

  useEffect(() => {
    let cancelled = false

    async function generateQr() {
      try {
        const dataUrl = await generateQrDataUrl(verificationUrl, {
          width: 420,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#06130f',
            light: '#ffffff',
          },
        })

        if (!cancelled) setQrDataUrl(dataUrl)
      } catch {
        if (!cancelled) setQrDataUrl('')
      }
    }

    void generateQr()

    return () => {
      cancelled = true
    }
  }, [verificationUrl])

  useEffect(() => {
    const updateScale = () => {
      const stageWidth = stageRef.current?.clientWidth || OFFICE_CARD_WIDTH
      const availableWidth = Math.max(220, stageWidth)
      const nextScale = Math.min(1, Math.max(0.22, availableWidth / OFFICE_CARD_WIDTH))
      setCardScale(Number(nextScale.toFixed(4)))
    }

    updateScale()

    const node = stageRef.current
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScale) : null

    if (node && resizeObserver) {
      resizeObserver.observe(node)
    }

    window.addEventListener('resize', updateScale)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [])

  async function downloadSide(side: CardSide) {
    const target = side === 'front' ? frontExportRef.current : backExportRef.current

    if (!target) {
      throw new Error(`Unable to prepare ${side} side for download.`)
    }

    await exportElementAsPng(target, `${officeBearerId}-${side}.png`, {
      width: OFFICE_CARD_WIDTH,
      height: OFFICE_CARD_HEIGHT,
      canvasWidth: OFFICE_CARD_WIDTH * 2.5,
      canvasHeight: OFFICE_CARD_HEIGHT * 2.5,
    })
  }

  async function handleDownload(target: CardSide | 'both') {
    if (!qrDataUrl) {
      setDownloadError('QR code is still preparing. Please try again in a moment.')
      return
    }

    setDownloadError('')
    setDownloading(target)

    try {
      if (target === 'both') {
        await downloadSide('front')
        await new Promise((resolve) => window.setTimeout(resolve, 250))
        await downloadSide('back')
      } else {
        await downloadSide(target)
      }
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : 'Failed to download office bearer card.',
      )
    } finally {
      setDownloading(null)
    }
  }

  async function copyVerificationUrl() {
    try {
      await navigator.clipboard.writeText(verificationUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setDownloadError('Unable to copy verification link. Open the verification page and copy it manually.')
    }
  }

  return (
    <article className="rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-slate-200/70 sm:p-5 print:p-0 print:shadow-none print:ring-0">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            {cardTitle}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            {displayDesignation} · {displayMemberName}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Office bearer ID: <span className="font-black text-slate-700">{officeBearerId}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedSide('front')}
            className={`rounded-2xl px-4 py-2 text-sm font-black transition ${selectedSide === 'front' ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            Front
          </button>
          <button
            type="button"
            onClick={() => setSelectedSide('back')}
            className={`rounded-2xl px-4 py-2 text-sm font-black transition ${selectedSide === 'back' ? 'bg-emerald-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => void handleDownload(selectedSide)}
            disabled={downloadDisabled}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#f6d56f] px-4 py-2 text-sm font-black text-emerald-950 shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={16} />
            {downloading === selectedSide ? 'Downloading...' : 'Download Side'}
          </button>
          <button
            type="button"
            onClick={() => void handleDownload('both')}
            disabled={downloadDisabled}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={16} />
            {downloading === 'both' ? 'Downloading...' : 'Both Sides'}
          </button>
          <button
            type="button"
            onClick={() => void copyVerificationUrl()}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-900 shadow-sm transition hover:bg-emerald-100"
          >
            <Copy size={16} />
            {copied ? 'Copied' : 'Copy Verify Link'}
          </button>
          <a
            href={verificationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 no-underline shadow-sm transition hover:bg-slate-50"
          >
            <ExternalLink size={16} />
            Open Verify
          </a>
        </div>
      </div>

      {downloadError ? (
        <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100 print:hidden">
          {downloadError}
        </div>
      ) : null}

      <div ref={stageRef} className="overflow-hidden rounded-[1.65rem] bg-slate-100 p-3 print:overflow-visible print:bg-white print:p-0">
        <ScaledOfficeCardShell scale={cardScale}>
          {selectedSide === 'front' ? (
            <OfficeBearerCardFront card={card} qrDataUrl={qrDataUrl} officeBearerId={officeBearerId} verificationUrl={verificationUrl} />
          ) : (
            <OfficeBearerCardBack card={card} qrDataUrl={qrDataUrl} officeBearerId={officeBearerId} verificationUrl={verificationUrl} />
          )}
        </ScaledOfficeCardShell>
      </div>

      <div className="pointer-events-none fixed left-[-10000px] top-0" aria-hidden="true">
        <OfficeBearerCardFront ref={frontExportRef} card={card} qrDataUrl={qrDataUrl} officeBearerId={officeBearerId} verificationUrl={verificationUrl} />
        <OfficeBearerCardBack ref={backExportRef} card={card} qrDataUrl={qrDataUrl} officeBearerId={officeBearerId} verificationUrl={verificationUrl} />
      </div>
    </article>
  )
}

export function DesignationCard({ card }: { card: DesignationCardRecord }) {
  return <OfficeBearerCardPackage card={card} />
}


function ScaledOfficeCardShell({
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
        width: `${OFFICE_CARD_WIDTH * scale}px`,
        height: `${OFFICE_CARD_HEIGHT * scale}px`,
      }}
    >
      <div
        style={{
          width: `${OFFICE_CARD_WIDTH}px`,
          height: `${OFFICE_CARD_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}

const OfficeBearerCardFront = forwardRef<HTMLDivElement, {
  card: DesignationCardRecord
  qrDataUrl: string
  officeBearerId: string
  verificationUrl: string
}>(function OfficeBearerCardFront(
  { card, officeBearerId },
  ref,
) {
  const committee = card.committee
  const memberName = formatOfficeBearerDisplayText(card.member.full_name || card.full_name_snapshot)
  const fatherName = formatOfficeBearerDisplayText(card.member.father_name || card.father_name_snapshot || 'N/A')
  const designationTitle = formatOfficeBearerDisplayText(card.designation_title)
  const committeeName = formatOfficeBearerDisplayText(committee?.name || 'Committee record')
  const memberNo = card.member.member_no || card.member_no_snapshot || 'Not issued'
  const location = committee ? getCommitteeLocation(committee) : getSnapshotLocation(card)
  const validity = formatDesignationValidity(card)
  const expiryDate = formatDesignationExpiry(card)
  const level = committee ? getCommitteeTypeLabel(committee.committee_type) : 'JAS Committee'
  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[34px] bg-[#06130f] text-white shadow-2xl ring-1 ring-amber-200/60"
      style={{ width: OFFICE_CARD_WIDTH, height: OFFICE_CARD_HEIGHT }}
    >
      <PremiumCardBackground />
      <div className="relative z-10 flex h-full flex-col p-[28px]">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative flex h-[100px] w-[100px] items-center justify-center rounded-[28px] border border-[#f6d56f]/50 bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
              <img src={JAS_LOGO_PATH} alt="JAS" className="h-full w-full rounded-[22px] object-cover object-top" draggable={false} />
            </div>
            <div>
              <p className="text-[18px] font-black uppercase tracking-[0.42em] text-[#f6d56f]">Jatt Alliance Sindh</p>
              <h3 className="mt-3 text-[56px] font-black uppercase leading-[0.88] tracking-[-0.06em]">Office Bearer</h3>
              <p className="mt-3 text-[19px] font-black uppercase tracking-[0.18em] text-white/70">Official designation authority card</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#f6d56f]/40 bg-[#f6d56f] px-7 py-4 text-right text-emerald-950 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
            <p className="text-[13px] font-black uppercase tracking-[0.2em]">Status</p>
            <p className="mt-1 flex items-center justify-end gap-2 text-[24px] font-black uppercase">
              <BadgeCheck className="h-6 w-6" /> Active
            </p>
          </div>
        </div>

        <div className="mt-7 grid flex-1 grid-cols-[222px_1fr_214px] gap-6">
          <div className="space-y-4">
            <div className="relative h-[222px] w-[222px] overflow-hidden rounded-[32px] border-[6px] border-white bg-white shadow-[0_22px_55px_rgba(0,0,0,0.33)]">
              {card.photoSignedUrl ? (
                <img src={card.photoSignedUrl} alt={memberName} className="h-full w-full object-cover object-top" draggable={false} />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#08251c,#0f5138)] text-[54px] font-black text-[#f6d56f]">
                  {getInitials(memberName)}
                </div>
              )}
            </div>

            <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
              <p className="text-[12px] font-black uppercase tracking-[0.2em] text-[#f6d56f]">Member ID</p>
              <p className="mt-1 whitespace-nowrap text-[20px] font-black uppercase leading-tight text-white">{memberNo}</p>
            </div>
          </div>

          <div className="min-w-0 rounded-[34px] border border-white/12 bg-white/[0.08] p-6 backdrop-blur">
            <p className="text-[16px] font-black uppercase tracking-[0.25em] text-[#f6d56f]">{designationTitle}</p>
            <h4 className="mt-4 line-clamp-2 text-[48px] font-black leading-[0.95] tracking-[-0.055em] text-white">{memberName}</h4>
            <p className="mt-3 line-clamp-1 text-[19px] font-bold text-white/68">Father: {fatherName}</p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <PremiumInfo label="Committee" value={committeeName} icon={<Landmark className="h-5 w-5" />} />
              <PremiumInfo label="Level" value={level} icon={<ShieldCheck className="h-5 w-5" />} />
              <PremiumInfo label="Location" value={location} icon={<MapPin className="h-5 w-5" />} />
              <PremiumInfo label="Validity" value={validity} icon={<CalendarDays className="h-5 w-5" />} compact />
            </div>

            <div className="mt-5 rounded-[22px] border border-[#f6d56f]/30 bg-[#f6d56f]/10 px-5 py-3.5">
              <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#f6d56f]">Authority note</p>
              <p className="mt-1 text-[14px] font-bold leading-5 text-white/72">This authority card is valid only with an active JAS committee designation.</p>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-[26px] border border-[#f6d56f]/45 bg-[#f6d56f] p-5 text-emerald-950 shadow-[0_18px_42px_rgba(0,0,0,0.25)]">
              <p className="text-[12px] font-black uppercase tracking-[0.2em]">Card Type</p>
              <p className="mt-2 text-[27px] font-black uppercase leading-none">Authority</p>
              <p className="mt-4 text-[11px] font-black uppercase tracking-[0.17em] opacity-75">Office Bearer Designation</p>
            </div>

            <div className="rounded-[26px] border border-[#f6d56f]/40 bg-[#06130f]/78 px-5 py-5 shadow-[0_18px_42px_rgba(0,0,0,0.22)]">
              <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#f6d56f]">Office Bearer ID</p>
              <p className="mt-3 break-words text-[18px] font-black leading-tight text-white">{officeBearerId}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">Verified on reverse side</p>
            </div>

            <div className="rounded-[26px] border border-amber-200/60 bg-amber-100 px-5 py-4 text-emerald-950 shadow-[0_18px_42px_rgba(0,0,0,0.18)]">
              <p className="text-[12px] font-black uppercase tracking-[0.18em]">Expiry Date</p>
              <p className="mt-2 text-[20px] font-black leading-tight">{expiryDate}</p>
            </div>

            <div className="mt-auto rounded-[26px] border border-white/12 bg-white/10 p-5 shadow-[0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-950">
                <QrCode className="h-6 w-6" />
              </div>
              <p className="mt-4 text-[12px] font-black uppercase tracking-[0.22em] text-[#f6d56f]">QR on Back</p>
              <p className="mt-2 text-[12px] font-bold leading-5 text-white/72">Scan the reverse-side QR code to confirm this office bearer authority.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
})

const OfficeBearerCardBack = forwardRef<HTMLDivElement, {
  card: DesignationCardRecord
  qrDataUrl: string
  officeBearerId: string
  verificationUrl: string
}>(function OfficeBearerCardBack(
  { card, qrDataUrl, officeBearerId, verificationUrl },
  ref,
) {
  const committee = card.committee
  const memberName = formatOfficeBearerDisplayText(card.member.full_name || card.full_name_snapshot)
  const designationTitle = formatOfficeBearerDisplayText(card.designation_title)
  const committeeName = formatOfficeBearerDisplayText(committee?.name || 'Committee record')
  const memberNo = card.member.member_no || card.member_no_snapshot || 'Not issued'
  const location = committee ? getCommitteeLocation(committee) : getSnapshotLocation(card)
  const validity = formatDesignationValidity(card)
  const expiryDate = formatDesignationExpiry(card)

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[34px] bg-[#f8faf7] text-slate-950 shadow-2xl ring-1 ring-amber-200/80"
      style={{ width: OFFICE_CARD_WIDTH, height: OFFICE_CARD_HEIGHT }}
    >
      <div className="absolute inset-0 opacity-[0.55]" style={{ backgroundImage: 'radial-gradient(circle at 18% 16%,rgba(246,213,111,.32),transparent 24%),radial-gradient(circle at 88% 14%,rgba(6,83,61,.12),transparent 28%),linear-gradient(135deg,#ffffff,#fbf7e8 48%,#eef8f2)' }} />
      <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#06130f]/10" />
      <div className="absolute -left-20 -bottom-24 h-72 w-72 rounded-full bg-[#f6d56f]/30" />

      <div className="relative z-10 flex h-full flex-col p-[28px]">
        <div className="flex items-start justify-between gap-5 border-b-4 border-[#d5ad44] pb-4">
          <div className="flex items-center gap-5">
            <div className="flex h-[74px] w-[74px] items-center justify-center rounded-[22px] bg-[#06130f] p-1.5 shadow-xl">
              <img src={JAS_LOGO_PATH} alt="JAS" className="h-full w-full rounded-[18px] object-cover object-top" draggable={false} />
            </div>
            <div>
              <p className="text-[12px] font-black uppercase tracking-[0.32em] text-emerald-800">Issuing Authority</p>
              <h3 className="mt-1 text-[33px] font-black uppercase tracking-[-0.01em] text-slate-950">Jatt Alliance Sindh</h3>
              <p className="mt-0.5 text-[14px] font-bold text-slate-500">Office bearer verification, authority and conditions</p>
            </div>
          </div>
          <div className="rounded-[24px] bg-[#06130f] px-6 py-3 text-right text-white shadow-xl">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f6d56f]">Card Type</p>
            <p className="mt-1 text-[21px] font-black uppercase">Authority</p>
          </div>
        </div>

        <div className="mt-4 grid flex-1 grid-cols-[1fr_248px] gap-5">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <BackInfo label="Bearer Name" value={memberName} />
              <BackInfo label="Member Number" value={memberNo} />
              <BackInfo label="Designation" value={designationTitle} />
              <BackInfo label="Office Bearer ID" value={officeBearerId} />
              <BackInfo label="Committee" value={committeeName} />
              <BackInfo label="Jurisdiction" value={location} />
              <BackInfo label="Validity" value={validity} wide />
              <BackInfo label="Expiry Date" value={expiryDate} />
              <BackInfo label="Verification Status" value="Valid active authority record" />
            </div>

            <div className="grid flex-1 grid-cols-[1fr_245px] gap-4">
              <div className="rounded-[24px] border border-slate-200 bg-white/84 p-4 shadow-sm">
                <p className="text-[13px] font-black uppercase tracking-[0.2em] text-emerald-800">Terms & Conditions</p>
                <ul className="mt-3 space-y-2 text-[12.5px] font-bold leading-5 text-slate-700">
                  <li>• Valid for one year from designation assignment date and only with active office bearer status.</li>
                  <li>• Misuse, transfer, alteration or unauthorized use of this authority card is prohibited.</li>
                  <li>• Verify through QR before accepting any office bearer authority.</li>
                </ul>
                <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-[10.8px] font-black uppercase tracking-[0.07em] text-amber-900 ring-1 ring-amber-100">Expired, suspended, resigned or completed designations make this card invalid.</p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white/88 p-4 shadow-sm">
                <p className="text-[12px] font-black uppercase tracking-[0.18em] text-emerald-800">Authorized Signature</p>
                <div className="mt-2 flex h-[88px] items-center justify-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                  <img src={JAS_SIGNATURE_PATH} alt="Authorized signature" className="h-[84px] w-[250px] object-contain brightness-75 contrast-150 saturate-0" draggable={false} />
                </div>
                <div className="mt-2 h-[2px] w-full bg-slate-500" />
                <p className="mt-2 text-[13px] font-black text-slate-950">Authorized Signature</p>
                <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">JAS Central Office</p>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-3 rounded-[30px] bg-[#06130f] p-4 text-white shadow-xl">
            <div className="rounded-[24px] bg-white p-3 text-center text-slate-950">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Verification QR" className="mx-auto h-[176px] w-[176px]" draggable={false} />
              ) : (
                <div className="mx-auto flex h-[176px] w-[176px] items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><QrCode /></div>
              )}
              <p className="mt-1.5 text-[12px] font-black uppercase tracking-[0.22em] text-slate-500">Scan to verify</p>
            </div>

            <div className="rounded-[22px] border border-white/12 bg-white/10 p-3.5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f6d56f]">Verification URL</p>
              <p className="mt-2 line-clamp-4 break-all text-[10.8px] font-semibold leading-4 text-white/70">{verificationUrl}</p>
            </div>

            <div className="rounded-[22px] border border-[#f6d56f]/40 bg-[#f6d56f] p-3.5 text-emerald-950">
              <p className="text-[11px] font-black uppercase tracking-[0.18em]">Issuing Organization</p>
              <p className="mt-1.5 text-[17px] font-black leading-tight">Jatt Alliance Sindh</p>
              <p className="mt-0.5 text-[12px] font-bold opacity-75">Sindh, Pakistan</p>
            </div>

            <div className="mt-auto rounded-[22px] border border-white/12 bg-white/10 p-3.5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f6d56f]">Official Notice</p>
              <p className="mt-1.5 text-[11px] font-semibold leading-4 text-white/70">This card verifies current office bearer authority only and does not replace the membership card.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
})

function PremiumCardBackground() {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#06130f,#073827_42%,#0f172a)]" />
      <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(circle at 18% 18%,#f6d56f 0,transparent 28%),radial-gradient(circle at 88% 12%,#d5ad44 0,transparent 25%),radial-gradient(circle at 90% 90%,#10b981 0,transparent 30%)' }} />
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border-[54px] border-[#f6d56f]/12" />
      <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#f6d56f]/10" />
      <div className="absolute inset-x-0 top-0 h-[10px] bg-[#f6d56f]" />
      <div className="absolute inset-x-0 bottom-0 h-[10px] bg-[#f6d56f]" />
    </>
  )
}

function PremiumInfo({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: ReactNode
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/18 p-4">
      <div className="flex items-center gap-2 text-[#f6d56f]">
        {icon}
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/48">{label}</p>
      </div>
      <p className={`${compact ? 'text-[15px] leading-5' : 'text-[17px] leading-6'} mt-2 line-clamp-2 font-black text-white`}>{value}</p>
    </div>
  )
}

function BackInfo({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded-[20px] border border-slate-200 bg-white/82 px-3.5 py-2.5 shadow-sm ${wide ? 'col-span-1' : ''}`}>
      <p className="text-[10.5px] font-black uppercase tracking-[0.18em] text-emerald-800">{label}</p>
      <p className={`${wide ? 'line-clamp-1 text-[14px]' : 'line-clamp-2 text-[15px]'} mt-1 font-black leading-5 text-slate-950`}>{value}</p>
    </div>
  )
}


function getSnapshotLocation(card: DesignationCardRecord) {
  return [card.taluka_snapshot, card.district_snapshot].filter(Boolean).join(', ') || 'Sindh'
}

function buildVerificationUrl(card: DesignationCardRecord) {
  return getOfficeBearerVerificationUrl(card)
}
