import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock3,
  FilePenLine,
  History,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useI18n } from '../lib/i18n'
import {
  PROFILE_UPDATE_ALLOWED_PHOTO_TYPES,
  buildProfileUpdateChanges,
  formatProfileUpdateValue,
  getProfileUpdateChangedFields,
  getProfileUpdatePhotoExtension,
  getProfileUpdateStatusClass,
  getProfileUpdateStatusLabel,
  memberToProfileUpdateDraft,
  parseProfileUpdateChanges,
  validateProfileUpdateDraft,
  type ProfileUpdateDraft,
  type ProfileUpdateFieldErrors,
  type ProfileUpdateMember,
  type ProfileUpdateRequest,
} from '../lib/profile-update'
import {
  bloodGroupOptions,
  genderOptions,
  sindhDistricts,
  talukasByDistrict,
} from '../lib/register/registration-options'
import { supabase } from '../lib/supabase/client'
import type { Database, Json } from '../lib/supabase/database.types'
import {
  formatCnicInput,
  formatDisplayDate,
  formatMobileInput,
  todayDate,
} from '../lib/shared/formatters'

export const Route = createFileRoute('/profile-update')({
  component: ProfileUpdatePage,
})

const copy = {
  en: {
    eyebrow: 'Approved Member Service',
    title: 'Request Profile Update',
    subtitle:
      'Submit corrections to your approved profile and digital membership card. Your current record stays active until an authorized membership reviewer approves the request.',
    approvedOnly:
      'Profile update requests are available only after membership approval.',
    pendingTitle: 'Request pending review',
    pendingText:
      'You already have a pending request. Cancel it before submitting a replacement request.',
    formTitle: 'Proposed profile details',
    formText:
      'Only values that differ from your current profile will be sent for review.',
    noteLabel: 'Reason / note for reviewer',
    notePlaceholder:
      'Briefly explain why these details should be changed. Do not include passwords or OTP codes.',
    photoTitle: 'Replace member photo (optional)',
    photoHelp: 'JPG, PNG, or WebP. Maximum 2 MB.',
    currentPhoto: 'Current photo',
    selectedPhoto: 'Selected replacement',
    submit: 'Submit Update Request',
    submitting: 'Submitting Request…',
    cancel: 'Cancel Pending Request',
    cancelling: 'Cancelling…',
    reset: 'Reset Form',
    noChanges: 'Change at least one profile value or select a new photo.',
    historyTitle: 'Request history',
    historyText: 'Review submitted, approved, rejected, and cancelled requests.',
    noHistory: 'No profile update request has been submitted yet.',
    memberNote: 'Member note',
    adminNote: 'Admin note',
    submitted: 'Submitted',
    reviewed: 'Reviewed',
    changes: 'Requested changes',
    before: 'Current',
    after: 'Requested',
    success: 'Your profile update request was submitted for admin review.',
    cancelled: 'The pending profile update request was cancelled.',
    back: 'Back to Dashboard',
    migrationMissing:
      'Profile update requests are not available yet. Apply the Phase 7 database migration first.',
  },
  ur: {
    eyebrow: 'منظور شدہ ممبر سروس',
    title: 'پروفائل اپڈیٹ کی درخواست',
    subtitle:
      'اپنی منظور شدہ پروفائل اور ڈیجیٹل ممبرشپ کارڈ کی تفصیلات میں درستگی کی درخواست دیں۔ ایڈمن کی منظوری تک موجودہ ریکارڈ فعال رہے گا۔',
    approvedOnly:
      'پروفائل اپڈیٹ کی درخواست صرف ممبرشپ منظور ہونے کے بعد دستیاب ہے۔',
    pendingTitle: 'درخواست زیرِ جائزہ ہے',
    pendingText:
      'آپ کی ایک درخواست پہلے سے زیرِ جائزہ ہے۔ نئی درخواست کے لیے موجودہ درخواست منسوخ کریں۔',
    formTitle: 'تجویز کردہ پروفائل تفصیلات',
    formText: 'صرف تبدیل شدہ معلومات ایڈمن جائزے کے لیے بھیجی جائیں گی۔',
    noteLabel: 'ایڈمن کے لیے وجہ / نوٹ',
    notePlaceholder: 'مختصر طور پر تبدیلی کی وجہ لکھیں۔ پاس ورڈ یا OTP نہ لکھیں۔',
    photoTitle: 'ممبر تصویر تبدیل کریں (اختیاری)',
    photoHelp: 'JPG، PNG یا WebP۔ زیادہ سے زیادہ 2 MB۔',
    currentPhoto: 'موجودہ تصویر',
    selectedPhoto: 'منتخب نئی تصویر',
    submit: 'اپڈیٹ درخواست جمع کریں',
    submitting: 'درخواست جمع ہو رہی ہے…',
    cancel: 'زیرِ جائزہ درخواست منسوخ کریں',
    cancelling: 'منسوخ ہو رہی ہے…',
    reset: 'فارم ری سیٹ کریں',
    noChanges: 'کم از کم ایک معلومات تبدیل کریں یا نئی تصویر منتخب کریں۔',
    historyTitle: 'درخواستوں کی تاریخ',
    historyText: 'جمع شدہ، منظور، مسترد اور منسوخ درخواستیں دیکھیں۔',
    noHistory: 'ابھی تک کوئی پروفائل اپڈیٹ درخواست جمع نہیں ہوئی۔',
    memberNote: 'ممبر نوٹ',
    adminNote: 'ایڈمن نوٹ',
    submitted: 'جمع شدہ',
    reviewed: 'جائزہ',
    changes: 'درخواست کردہ تبدیلیاں',
    before: 'موجودہ',
    after: 'درخواست کردہ',
    success: 'آپ کی پروفائل اپڈیٹ درخواست ایڈمن جائزے کے لیے جمع ہوگئی۔',
    cancelled: 'زیرِ جائزہ پروفائل اپڈیٹ درخواست منسوخ کردی گئی۔',
    back: 'ڈیش بورڈ پر واپس',
    migrationMissing:
      'پروفائل اپڈیٹ سروس ابھی دستیاب نہیں۔ پہلے Phase 7 ڈیٹابیس مائیگریشن چلائیں۔',
  },
  sd: {
    eyebrow: 'منظور ٿيل ميمبر سروس',
    title: 'پروفائل اپڊيٽ جي درخواست',
    subtitle:
      'پنهنجي منظور ٿيل پروفائل ۽ ڊجيٽل ميمبرشپ ڪارڊ جي ڄاڻ ۾ درستگي لاءِ درخواست ڏيو. ايڊمن جي منظوري تائين موجوده رڪارڊ فعال رهندو.',
    approvedOnly:
      'پروفائل اپڊيٽ جي درخواست ميمبرشپ منظور ٿيڻ کان پوءِ دستياب آهي.',
    pendingTitle: 'درخواست جائزي هيٺ آهي',
    pendingText:
      'توهان جي هڪ درخواست اڳ ۾ جائزي هيٺ آهي. نئين درخواست لاءِ موجوده درخواست رد ڪريو.',
    formTitle: 'تجويز ڪيل پروفائل ڄاڻ',
    formText: 'صرف تبديل ٿيل ڄاڻ ايڊمن جائزي لاءِ موڪلي ويندي.',
    noteLabel: 'ايڊمن لاءِ سبب / نوٽ',
    notePlaceholder: 'تبديلي جو مختصر سبب لکو. پاسورڊ يا OTP نه لکو.',
    photoTitle: 'ميمبر تصوير تبديل ڪريو (اختياري)',
    photoHelp: 'JPG، PNG يا WebP۔ وڌ ۾ وڌ 2 MB۔',
    currentPhoto: 'موجوده تصوير',
    selectedPhoto: 'چونڊيل نئين تصوير',
    submit: 'اپڊيٽ درخواست جمع ڪريو',
    submitting: 'درخواست جمع ٿي رهي آهي…',
    cancel: 'جائزي هيٺ درخواست رد ڪريو',
    cancelling: 'رد ٿي رهي آهي…',
    reset: 'فارم ري سيٽ ڪريو',
    noChanges: 'گهٽ ۾ گهٽ هڪ ڄاڻ تبديل ڪريو يا نئين تصوير چونڊيو.',
    historyTitle: 'درخواستن جي تاريخ',
    historyText: 'جمع، منظور، رد ۽ منسوخ درخواستون ڏسو.',
    noHistory: 'اڃا ڪا پروفائل اپڊيٽ درخواست جمع نه ٿي آهي.',
    memberNote: 'ميمبر نوٽ',
    adminNote: 'ايڊمن نوٽ',
    submitted: 'جمع ٿيل',
    reviewed: 'جائزو',
    changes: 'درخواست ڪيل تبديليون',
    before: 'موجوده',
    after: 'درخواست ڪيل',
    success: 'توهان جي پروفائل اپڊيٽ درخواست ايڊمن جائزي لاءِ جمع ٿي وئي.',
    cancelled: 'جائزي هيٺ پروفائل اپڊيٽ درخواست رد ڪئي وئي.',
    back: 'ڊيش بورڊ ڏانهن واپس',
    migrationMissing:
      'پروفائل اپڊيٽ سروس اڃا دستياب ناهي. پهرين Phase 7 ڊيٽابيس مائيگريشن هلائيو.',
  },
} as const

const memberSelect = [
  'id',
  'user_id',
  'member_no',
  'status',
  'full_name',
  'father_name',
  'cnic',
  'mobile',
  'district',
  'taluka',
  'profession',
  'caste_branch',
  'address',
  'date_of_birth',
  'gender',
  'education',
  'blood_group',
  'emergency_contact_name',
  'emergency_contact_relation',
  'emergency_contact_mobile',
  'photo_url',
  'updated_at',
].join(', ')

function ProfileUpdatePage() {
  const navigate = useNavigate()
  const { language, direction, t } = useI18n()
  const text = copy[language]
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [member, setMember] = useState<ProfileUpdateMember | null>(null)
  const [requests, setRequests] = useState<ProfileUpdateRequest[]>([])
  const [draft, setDraft] = useState<ProfileUpdateDraft | null>(null)
  const [errors, setErrors] = useState<ProfileUpdateFieldErrors>({})
  const [memberNote, setMemberNote] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const pendingRequest = useMemo(
    () => requests.find((request) => request.status === 'pending') ?? null,
    [requests],
  )

  useEffect(() => {
    void loadPage()
  }, [])

  useEffect(() => {
    if (!photo) {
      setPhotoPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(photo)
    setPhotoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  async function loadPage() {
    setLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      await navigate({ to: '/login', replace: true })
      return
    }

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select(memberSelect)
      .eq('user_id', user.id)
      .maybeSingle()
      .returns<ProfileUpdateMember | null>()

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    setMember(memberData)
    setDraft(memberData ? memberToProfileUpdateDraft(memberData) : null)
    setPhoto(null)
    setMemberNote('')
    setErrors({})

    if (memberData?.photo_url) {
      const { data } = await supabase.storage
        .from('member-photos')
        .createSignedUrl(memberData.photo_url, 60 * 60)
      setCurrentPhotoUrl(data?.signedUrl ?? null)
    } else {
      setCurrentPhotoUrl(null)
    }

    const { data: requestRows, error: requestError } = await supabase
      .from('profile_update_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (requestError) {
      const message = /relation .*profile_update_requests.* does not exist/i.test(
        requestError.message,
      )
        ? text.migrationMissing
        : requestError.message
      setError(message)
      setRequests([])
    } else {
      setRequests((requestRows ?? []).map(normalizeRequestRow))
    }

    setLoading(false)
  }

  function updateDraft(field: keyof ProfileUpdateDraft, value: string) {
    setDraft((current) => (current ? { ...current, [field]: value } : current))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function handleDistrictChange(value: string) {
    setDraft((current) => {
      if (!current) return current
      const talukas = talukasByDistrict[value] ?? []
      return {
        ...current,
        district: value,
        taluka: talukas.includes(current.taluka) ? current.taluka : '',
      }
    })
    setErrors((current) => ({
      ...current,
      district: undefined,
      taluka: undefined,
    }))
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    setPhoto(selected)
    setErrors((current) => ({ ...current, photo: undefined }))
  }

  function resetForm() {
    if (!member) return
    setDraft(memberToProfileUpdateDraft(member))
    setMemberNote('')
    setPhoto(null)
    setErrors({})
    setError('')
    setSuccess('')
  }

  async function submitRequest() {
    if (!member || !draft || pendingRequest) return

    setError('')
    setSuccess('')

    const validation = validateProfileUpdateDraft(draft, photo)
    setErrors(validation.errors)

    if (!validation.valid) {
      window.setTimeout(() => {
        document
          .querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus()
      }, 50)
      return
    }

    const changes = buildProfileUpdateChanges(member, validation.normalized)

    if (Object.keys(changes).length === 0 && !photo) {
      setError(text.noChanges)
      return
    }

    setSaving(true)
    let uploadedPath: string | null = null

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) throw new Error('Your session has expired.')

      const requestId = crypto.randomUUID()

      if (photo) {
        const extension = getProfileUpdatePhotoExtension(photo)
        uploadedPath = `${user.id}/profile-update-requests/${requestId}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from('member-photos')
          .upload(uploadedPath, photo, {
            cacheControl: '3600',
            contentType: photo.type,
            upsert: false,
          })

        if (uploadError) throw new Error(uploadError.message)
        changes.photo_url = uploadedPath
      }

      const { error: requestError } = await supabase.rpc(
        'submit_profile_update_request',
        {
          _request_id: requestId,
          _requested_changes: changes as Json,
          _member_note: memberNote.trim() || undefined,
        },
      )

      if (requestError) throw new Error(requestError.message)

      setSuccess(text.success)
      await loadPage()
    } catch (submitError) {
      if (uploadedPath) {
        await supabase.storage.from('member-photos').remove([uploadedPath])
      }
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to submit profile update request.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function cancelPendingRequest() {
    if (!pendingRequest) return
    if (!window.confirm(text.cancel)) return

    setCancelling(true)
    setError('')
    setSuccess('')

    const requestedPhotoPath = pendingRequest.requested_changes.photo_url
    const { error: cancelError } = await supabase.rpc(
      'cancel_profile_update_request',
      { _request_id: pendingRequest.id },
    )

    if (cancelError) {
      setError(cancelError.message)
    } else {
      if (requestedPhotoPath) {
        await supabase.storage
          .from('member-photos')
          .remove([requestedPhotoPath])
      }
      setSuccess(text.cancelled)
      await loadPage()
    }

    setCancelling(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen px-3 py-8 sm:px-4" dir={direction}>
        <div className="page-wrap rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
            Loading profile update service…
          </div>
        </div>
      </main>
    )
  }

  if (!member || member.status !== 'approved' || !draft) {
    return (
      <main className="min-h-screen px-3 py-8 sm:px-4" dir={direction}>
        <div className="page-wrap rounded-3xl border border-amber-200 bg-amber-50 p-7 shadow-sm">
          <ShieldCheck className="h-10 w-10 text-amber-700" />
          <h1 className="mt-4 text-2xl font-black text-slate-950">
            {text.title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            {text.approvedOnly}
          </p>
          <Link to="/dashboard" className="primary-btn mt-6">
            <ArrowLeft className="h-4 w-4" />
            {text.back}
          </Link>
        </div>
      </main>
    )
  }

  const talukaOptions = talukasByDistrict[draft.district] ?? []

  return (
    <main className="min-h-screen px-3 py-7 sm:px-4 sm:py-9" dir={direction}>
      <div className="page-wrap space-y-6">
        <header className="overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-6 text-white sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
                  {text.eyebrow}
                </p>
                <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                  {text.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">
                  {text.subtitle}
                </p>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-black text-white no-underline transition hover:bg-white/15"
              >
                <ArrowLeft className="h-4 w-4" />
                {text.back}
              </Link>
            </div>
          </div>
        </header>

        {error ? <Message tone="error">{error}</Message> : null}
        {success ? <Message tone="success">{success}</Message> : null}

        {pendingRequest ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
                <div>
                  <h2 className="text-xl font-black text-amber-950">
                    {text.pendingTitle}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-amber-900/80">
                    {text.pendingText}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void cancelPendingRequest()}
                disabled={cancelling}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-black text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-60"
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {cancelling ? text.cancelling : text.cancel}
              </button>
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                <FilePenLine className="me-2 inline h-4 w-4" />
                {text.formTitle}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {text.formText}
              </p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
              {member.member_no}
            </span>
          </div>

          <div className="mt-6 space-y-7">
            <FormSection title="Identity">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label={t('register.field.fullName')}
                  error={errors.full_name}
                >
                  <input
                    value={draft.full_name}
                    onChange={(event) =>
                      updateDraft('full_name', event.target.value)
                    }
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    aria-invalid={Boolean(errors.full_name)}
                  />
                </FormField>
                <FormField
                  label={t('register.field.fatherName')}
                  error={errors.father_name}
                >
                  <input
                    value={draft.father_name}
                    onChange={(event) =>
                      updateDraft('father_name', event.target.value)
                    }
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    aria-invalid={Boolean(errors.father_name)}
                  />
                </FormField>
                <FormField label={t('register.field.cnic')} error={errors.cnic}>
                  <input
                    value={draft.cnic}
                    onChange={(event) =>
                      updateDraft('cnic', formatCnicInput(event.target.value))
                    }
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    inputMode="numeric"
                    aria-invalid={Boolean(errors.cnic)}
                  />
                </FormField>
                <FormField
                  label={t('register.field.mobile')}
                  error={errors.mobile}
                >
                  <input
                    value={draft.mobile}
                    onChange={(event) =>
                      updateDraft('mobile', formatMobileInput(event.target.value))
                    }
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    inputMode="tel"
                    aria-invalid={Boolean(errors.mobile)}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Address and Area">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  label={t('register.field.district')}
                  error={errors.district}
                >
                  <select
                    value={draft.district}
                    onChange={(event) => handleDistrictChange(event.target.value)}
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    aria-invalid={Boolean(errors.district)}
                  >
                    <option value="">Select district</option>
                    {sindhDistricts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  label={t('register.field.taluka')}
                  error={errors.taluka}
                >
                  <select
                    value={draft.taluka}
                    onChange={(event) => updateDraft('taluka', event.target.value)}
                    disabled={Boolean(pendingRequest) || saving || !draft.district}
                    className="profile-update-input"
                    aria-invalid={Boolean(errors.taluka)}
                  >
                    <option value="">Select taluka</option>
                    {talukaOptions.map((taluka) => (
                      <option key={taluka} value={taluka}>
                        {taluka}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  label={t('register.field.address')}
                  error={errors.address}
                  className="md:col-span-2"
                >
                  <textarea
                    value={draft.address}
                    onChange={(event) => updateDraft('address', event.target.value)}
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input min-h-28 resize-y"
                    aria-invalid={Boolean(errors.address)}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Profile and Card Details">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  label={t('register.field.profession')}
                  error={errors.profession}
                >
                  <input
                    value={draft.profession}
                    onChange={(event) =>
                      updateDraft('profession', event.target.value)
                    }
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    aria-invalid={Boolean(errors.profession)}
                  />
                </FormField>
                <FormField
                  label={t('register.field.casteBranch')}
                  error={errors.caste_branch}
                >
                  <input
                    value={draft.caste_branch}
                    onChange={(event) =>
                      updateDraft('caste_branch', event.target.value)
                    }
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    aria-invalid={Boolean(errors.caste_branch)}
                  />
                </FormField>
                <FormField
                  label={t('register.field.dateOfBirth')}
                  error={errors.date_of_birth}
                >
                  <input
                    type="date"
                    max={todayDate()}
                    value={draft.date_of_birth}
                    onChange={(event) =>
                      updateDraft('date_of_birth', event.target.value)
                    }
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    aria-invalid={Boolean(errors.date_of_birth)}
                  />
                </FormField>
                <FormField
                  label={t('register.field.gender')}
                  error={errors.gender}
                >
                  <select
                    value={draft.gender}
                    onChange={(event) => updateDraft('gender', event.target.value)}
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    aria-invalid={Boolean(errors.gender)}
                  >
                    <option value="">Select gender</option>
                    {genderOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField
                  label={t('register.field.education')}
                  error={errors.education}
                >
                  <input
                    value={draft.education}
                    onChange={(event) => updateDraft('education', event.target.value)}
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    aria-invalid={Boolean(errors.education)}
                  />
                </FormField>
                <FormField
                  label={t('register.field.bloodGroup')}
                  error={errors.blood_group}
                >
                  <select
                    value={draft.blood_group}
                    onChange={(event) =>
                      updateDraft('blood_group', event.target.value)
                    }
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    aria-invalid={Boolean(errors.blood_group)}
                  >
                    <option value="">Select blood group</option>
                    {bloodGroupOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Emergency Contact">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  label={t('register.field.contactName')}
                  error={errors.emergency_contact_name}
                >
                  <input
                    value={draft.emergency_contact_name}
                    onChange={(event) =>
                      updateDraft('emergency_contact_name', event.target.value)
                    }
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    aria-invalid={Boolean(errors.emergency_contact_name)}
                  />
                </FormField>
                <FormField
                  label={t('register.field.relation')}
                  error={errors.emergency_contact_relation}
                >
                  <input
                    value={draft.emergency_contact_relation}
                    onChange={(event) =>
                      updateDraft('emergency_contact_relation', event.target.value)
                    }
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    aria-invalid={Boolean(errors.emergency_contact_relation)}
                  />
                </FormField>
                <FormField
                  label={t('register.field.contactMobile')}
                  error={errors.emergency_contact_mobile}
                >
                  <input
                    value={draft.emergency_contact_mobile}
                    onChange={(event) =>
                      updateDraft(
                        'emergency_contact_mobile',
                        formatMobileInput(event.target.value),
                      )
                    }
                    disabled={Boolean(pendingRequest) || saving}
                    className="profile-update-input"
                    inputMode="tel"
                    aria-invalid={Boolean(errors.emergency_contact_mobile)}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title={text.photoTitle}>
              <div className="grid gap-4 lg:grid-cols-[220px_220px_minmax(0,1fr)]">
                <PhotoBox
                  label={text.currentPhoto}
                  src={currentPhotoUrl}
                  fallback={<Camera className="h-8 w-8 text-slate-400" />}
                />
                <PhotoBox
                  label={text.selectedPhoto}
                  src={photoPreviewUrl}
                  fallback={<FilePenLine className="h-8 w-8 text-slate-400" />}
                />
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                  <label className="block text-sm font-black text-slate-900">
                    {text.photoTitle}
                  </label>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {text.photoHelp}
                  </p>
                  <input
                    type="file"
                    accept={PROFILE_UPDATE_ALLOWED_PHOTO_TYPES.join(',')}
                    onChange={handlePhotoChange}
                    disabled={Boolean(pendingRequest) || saving}
                    className="mt-4 block w-full text-sm text-slate-600 file:me-3 file:rounded-xl file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
                    aria-invalid={Boolean(errors.photo)}
                  />
                  {errors.photo ? (
                    <p className="mt-2 text-xs font-bold text-red-700">
                      {errors.photo}
                    </p>
                  ) : null}
                </div>
              </div>
            </FormSection>

            <FormSection title={text.noteLabel}>
              <textarea
                value={memberNote}
                onChange={(event) => setMemberNote(event.target.value.slice(0, 500))}
                disabled={Boolean(pendingRequest) || saving}
                className="profile-update-input min-h-28 resize-y"
                placeholder={text.notePlaceholder}
                maxLength={500}
              />
              <p className="mt-2 text-end text-xs font-semibold text-slate-400">
                {memberNote.length}/500
              </p>
            </FormSection>
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              disabled={Boolean(pendingRequest) || saving}
              className="secondary-btn"
            >
              <RotateCcw className="h-4 w-4" />
              {text.reset}
            </button>
            <button
              type="button"
              onClick={() => void submitRequest()}
              disabled={Boolean(pendingRequest) || saving}
              className="primary-btn"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? text.submitting : text.submit}
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <History className="mt-0.5 h-6 w-6 text-emerald-700" />
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                {text.historyTitle}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {text.historyText}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {requests.map((request) => (
              <RequestHistoryCard key={request.id} request={request} text={text} />
            ))}
            {!requests.length ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
                {text.noHistory}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <style>{`
        .profile-update-input {
          width: 100%;
          min-height: 46px;
          border-radius: 0.85rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0.72rem 0.9rem;
          color: rgb(15 23 42);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 160ms ease, box-shadow 160ms ease;
        }
        .profile-update-input:focus {
          border-color: rgb(5 150 105);
          box-shadow: 0 0 0 3px rgb(16 185 129 / 0.13);
        }
        .profile-update-input[aria-invalid="true"] {
          border-color: rgb(248 113 113);
          background: rgb(254 242 242);
        }
        .profile-update-input:disabled {
          cursor: not-allowed;
          background: rgb(248 250 252);
          color: rgb(100 116 139);
        }
      `}</style>
    </main>
  )
}

function normalizeRequestRow(
  row: Database['public']['Tables']['profile_update_requests']['Row'],
): ProfileUpdateRequest {
  const status = ['pending', 'approved', 'rejected', 'cancelled'].includes(
    row.status,
  )
    ? (row.status as ProfileUpdateRequest['status'])
    : 'pending'

  return {
    ...row,
    status,
    requested_changes: parseProfileUpdateChanges(row.requested_changes),
    current_snapshot: parseProfileUpdateChanges(row.current_snapshot),
  }
}

function Message({
  tone,
  children,
}: {
  tone: 'error' | 'success'
  children: ReactNode
}) {
  const success = tone === 'success'
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-bold ${
        success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-800'
      }`}
    >
      {success ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  )
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <h3 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-800">
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function FormField({
  label,
  error,
  className = '',
  children,
}: {
  label: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-black text-slate-800">
        {label} <span className="text-red-500">*</span>
      </span>
      {children}
      {error ? (
        <span className="mt-2 block text-xs font-bold text-red-700">{error}</span>
      ) : null}
    </label>
  )
}

function PhotoBox({
  label,
  src,
  fallback,
}: {
  label: string
  src: string | null
  fallback: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {src ? (
        <img
          src={src}
          alt={label}
          className="h-52 w-full rounded-xl object-cover object-top"
        />
      ) : (
        <div className="flex h-52 items-center justify-center rounded-xl bg-slate-100">
          {fallback}
        </div>
      )}
    </div>
  )
}

function RequestHistoryCard({
  request,
  text,
}: {
  request: ProfileUpdateRequest
  text: (typeof copy)[keyof typeof copy]
}) {
  const rows = getProfileUpdateChangedFields(request)
  const StatusIcon =
    request.status === 'approved'
      ? BadgeCheck
      : request.status === 'rejected'
        ? XCircle
        : request.status === 'cancelled'
          ? XCircle
          : Clock3

  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${getProfileUpdateStatusClass(
              request.status,
            )}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {getProfileUpdateStatusLabel(request.status)}
          </span>
          <p className="mt-3 text-sm font-black text-slate-900">
            {request.member_no || request.member_name}
          </p>
        </div>
        <div className="text-xs font-semibold leading-5 text-slate-500 sm:text-end">
          <p>
            {text.submitted}: {formatDisplayDate(request.created_at)}
          </p>
          {request.reviewed_at ? (
            <p>
              {text.reviewed}: {formatDisplayDate(request.reviewed_at)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
          {text.changes}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.field}
              className="rounded-2xl border border-slate-200 bg-white p-3"
            >
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                {row.label}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-slate-50 p-2">
                  <span className="block font-black text-slate-400">
                    {text.before}
                  </span>
                  <span className="mt-1 block break-words font-bold text-slate-700">
                    {formatProfileUpdateValue(row.field, row.before)}
                  </span>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2">
                  <span className="block font-black text-emerald-600">
                    {text.after}
                  </span>
                  <span className="mt-1 block break-words font-bold text-emerald-900">
                    {formatProfileUpdateValue(row.field, row.after)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {request.member_note ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
          <strong>{text.memberNote}:</strong> {request.member_note}
        </div>
      ) : null}

      {request.admin_note ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          <strong>{text.adminNote}:</strong> {request.admin_note}
        </div>
      ) : null}
    </article>
  )
}
