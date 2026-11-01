// src/routes/admin/members/$id/card.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  IdCard,
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
} from '../../../../components/MembershipCard'
import { supabase } from '../../../../lib/supabase/client'
import { exportElementAsPng } from '../../../../lib/shared/card-export'
import { generateQrDataUrl } from '../../../../lib/shared/qrcode'
import { fetchActiveMemberCardDesignation } from '../../../../lib/member-card-designation'
import { PUBLIC_SITE_ORIGIN } from '../../../../lib/member-card-config'

export const Route = createFileRoute('/admin/members/$id/card')({
  component: AdminMemberCardPage,
})

const JAS_LOGO_PATH = '/jas/logo.jpeg'
const JAS_FLAG_PATH = '/jas/flag.jpeg'
const MEMBER_PHOTO_BUCKET = 'member-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60
const PUBLIC_VERIFY_ORIGIN = PUBLIC_SITE_ORIGIN
const MEMBERSHIP_REVIEW_ROLES: Array<
  'admin' | 'super_admin' | 'membership_admin'
> = ['admin', 'super_admin', 'membership_admin']

type DownloadTarget = CardSide | 'both' | null

type AdminAccessResult =
  | { ok: true }
  | { ok: false; redirectTo: '/login' | '/dashboard' }

function AdminMemberCardPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

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
        const access = await ensureAdminAccess()

        if (!access.ok) {
          await navigate({ to: access.redirectTo })
          return
        }

        const [logoDataUrl, flagDataUrl] = await Promise.all([
          imageUrlToDataUrl(JAS_LOGO_PATH),
          imageUrlToDataUrl(JAS_FLAG_PATH),
        ])

        setLogoUrl(logoDataUrl || JAS_LOGO_PATH)
        setFlagUrl(flagDataUrl || JAS_FLAG_PATH)

        const data = await fetchMemberForCard(id)

        if (!data) {
          throw new Error('Member record not found.')
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

        const publicVerifyUrl = `${PUBLIC_VERIFY_ORIGIN}/verify/${encodeURIComponent(
          data.member_no,
        )}`

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
          const { data: signed } = await supabase.storage
            .from(MEMBER_PHOTO_BUCKET)
            .createSignedUrl(data.photo_url, SIGNED_URL_TTL_SECONDS)

          if (signed?.signedUrl) {
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
            : 'Failed to load digital membership card.',
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [id, navigate],
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
      throw new Error('Member number is not available.')
    }

    const targetRef = side === 'front' ? frontExportRef : backExportRef

    if (!targetRef.current) {
      throw new Error(`Unable to prepare ${side} side for download.`)
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
      setSuccess(`${capitalize(side)} side downloaded successfully.`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to download ${side} side. Please try again.`,
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
      setSuccess('Front and back sides downloaded successfully.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to download both card sides. Please try again.',
      )
    } finally {
      setDownloadingTarget(null)
    }
  }

  async function copyVerifyUrl() {
    if (!verifyUrl) return

    try {
      await navigator.clipboard.writeText(verifyUrl)
      setSuccess('Verification link copied.')
      setError('')
    } catch {
      setError('Could not copy verification link.')
    }
  }

  if (loading) {
    return (
      <main className="px-3 py-6 sm:px-4 sm:py-10">
        <div className="page-wrap rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            Loading digital card...
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="px-3 py-6 sm:px-4 sm:py-10">
      <div className="page-wrap space-y-5 sm:space-y-6">
        <header className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-5 sm:p-7">
            <BackToMember id={id} />

            <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                  Admin Card Preview
                </p>

                <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Digital Membership Card
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Preview and download the same front/back card design that the
                  approved member sees in the dashboard.
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
                  Refresh
                </button>

                {cardReady ? (
                  <CardSideToggle
                    selectedSide={selectedSide}
                    onSelect={setSelectedSide}
                  />
                ) : null}
              </div>
            </div>
          </div>

          {member ? (
            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
              <SummaryItem
                label="Member"
                value={member.full_name}
                icon={<UserCardIcon />}
              />
              <SummaryItem
                label="Status"
                value={getStatusLabel(member.status)}
                icon={<ShieldCheck className="h-4 w-4" />}
              />
              <SummaryItem
                label="Member No"
                value={member.member_no || 'Not issued'}
                icon={<IdCard className="h-4 w-4" />}
              />
              <SummaryItem
                label="Card State"
                value={cardReady ? 'Ready' : 'Not available'}
                icon={<CreditCard className="h-4 w-4" />}
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
            title="Member record not found"
            message="This member record could not be loaded. Please return to the admin list and try again."
            action={
              <Link
                to="/admin"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold !text-white no-underline shadow-sm transition hover:bg-slate-800 hover:!text-white"
                style={{ color: '#ffffff' }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Admin
              </Link>
            }
          />
        ) : cardReady ? (
          <>
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
              <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 sm:p-5">
                <p className="mb-3 text-center text-xs font-semibold text-slate-500 sm:hidden">
                  Card preview auto-fits your screen. Use the buttons to switch sides.
                </p>

                <div ref={visibleStageRef} className="w-full overflow-hidden pb-2">
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
                        Card is ready
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        This member is approved and has a membership number. The
                        QR code points to the public verification page.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Verification Link
                  </p>

                  <p className="mt-2 break-all rounded-2xl bg-slate-50 p-3 font-mono text-xs font-semibold text-slate-700 ring-1 ring-slate-100">
                    {verifyUrl}
                  </p>

                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={copyVerifyUrl}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </button>

                    <Link
                      to="/verify/$memberNo"
                      params={{ memberNo: member.member_no ?? '' }}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 no-underline shadow-sm transition hover:bg-emerald-100"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Verification
                    </Link>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Download Card
                  </p>

                  <div className="mt-3 grid gap-2">
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
                        ? 'Downloading...'
                        : 'Download Front PNG'}
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
                        ? 'Downloading...'
                        : 'Download Back PNG'}
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
                        ? 'Downloading both...'
                        : 'Download Both Sides'}
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
            title="Digital card is not available yet"
            message={
              member.status === 'approved'
                ? 'This member is approved, but the member number is not available yet. The card will become available after member number issuance.'
                : 'This digital card will be available only after admin approval and member number issuance.'
            }
            action={
              <Link
                to="/admin/members/$id"
                params={{ id }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold !text-white no-underline shadow-sm transition hover:bg-slate-800 hover:!text-white"
                style={{ color: '#ffffff' }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Member Details
              </Link>
            }
          />
        )}
      </div>
    </main>
  )
}

function BackToMember({ id }: { id: string }) {
  return (
    <Link
      to="/admin/members/$id"
      params={{ id }}
      className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 no-underline hover:text-emerald-800"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Member Details
    </Link>
  )
}

function CardSideToggle({
  selectedSide,
  onSelect,
}: {
  selectedSide: CardSide
  onSelect: (side: CardSide) => void
}) {
  const labels: Record<CardSide, string> = {
    front: 'Front',
    back: 'Back',
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
  frontRef: React.RefObject<HTMLDivElement | null>
  backRef: React.RefObject<HTMLDivElement | null>
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

async function ensureAdminAccess(): Promise<AdminAccessResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { ok: false, redirectTo: '/login' }
  }

  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('id, role')
    .eq('user_id', user.id)
    .in('role', MEMBERSHIP_REVIEW_ROLES)
    .limit(1)

  if (roleError || !roles?.length) {
    return { ok: false, redirectTo: '/dashboard' }
  }

  return { ok: true }
}

async function fetchMemberForCard(id: string) {
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
    .eq('id', id)
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

function getStatusLabel(status: string) {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    default:
      return 'Pending'
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}