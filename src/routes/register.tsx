import { createFileRoute, useBlocker, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { RegisterAreaStep } from '../components/register/RegisterAreaStep'
import { RegisterEmergencyStep } from '../components/register/RegisterEmergencyStep'
import { MembershipFeeSummary } from '../components/register/RegisterFormShell'
import { RegisterIdentityStep } from '../components/register/RegisterIdentityStep'
import { RegisterReviewStep } from '../components/register/RegisterPaymentStep'
import { RegisterProfileStep } from '../components/register/RegisterProfileStep'
import { useI18n } from '../lib/i18n'
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_SIZE_BYTES,
  REGISTER_DRAFT_VERSION,
  focusFirstInvalidRegisterField,
  getRegisterDescriptionIds,
  initialRegisterForm,
  memberToRegisterForm,
  readRegisterDraft,
  registerDraftKey,
  registerFormSteps,
  talukasByDistrict,
  validateRegisterForm,
  type ExistingMember,
  type FieldErrors,
  type FormField,
  type RegisterFormState,
} from '../lib/register.validation'
import { supabase } from '../lib/supabase/client'
import {
  normalizeMobile,
  optionalText,
} from '../lib/shared/formatters'
import { journeyCopy } from '../lib/member-journey'
import './register.css'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const { t, direction, language } = useI18n()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState('')
  const [existingMember, setExistingMember] = useState<ExistingMember | null>(null)
  const [form, setForm] = useState<RegisterFormState>(initialRegisterForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [currentStep, setCurrentStep] = useState(0)

  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [existingPhotoSignedUrl, setExistingPhotoSignedUrl] = useState<string | null>(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const copy = journeyCopy[language]
  const [autoSave, setAutoSave] = useState(false)
  const [savedForm, setSavedForm] = useState(JSON.stringify(initialRegisterForm))
  const submitted = useRef(false)
  const [draftSavedAt, setDraftSavedAt] = useState('')

  const locked = existingMember?.status === 'approved'
  const isPendingEdit = existingMember?.status === 'pending'
  const isRejected = existingMember?.status === 'rejected'
  const isLastStep = currentStep === registerFormSteps.length - 1

  const serializedForm = JSON.stringify(form)
  const dirty = !loading && !locked && !submitted.current && (serializedForm !== savedForm || Boolean(photo))
  useBlocker({
    shouldBlockFn: () => dirty && !window.confirm(copy.leave),
    enableBeforeUnload: dirty,
  })
  useEffect(() => {
    if (!autoSave || loading || submitting || existingMember || !userId || submitted.current || serializedForm === savedForm) return
    const timer = setTimeout(() => {
      try {
        const savedAt = new Date().toISOString()
        localStorage.setItem(registerDraftKey(userId), JSON.stringify({ version: REGISTER_DRAFT_VERSION, savedAt, form: JSON.parse(serializedForm) }))
        setDraftSavedAt(savedAt)
        setSavedForm(serializedForm)
      } catch { setAutoSave(false); setError(t('register.draftSaveFailed')) }
    }, 1200)
    return () => clearTimeout(timer)
  }, [autoSave, loading, submitting, existingMember, userId, serializedForm, savedForm, t])

  const localizedSteps = useMemo(
    () =>
      registerFormSteps.map((step) => ({
        ...step,
        title: t(step.titleKey),
        shortTitle: t(step.shortTitleKey),
        description: t(step.descriptionKey),
      })),
    [t],
  )
  const currentStepData = localizedSteps[currentStep]
  const progressPercent = Math.round(((currentStep + 1) / registerFormSteps.length) * 100)

  const talukaOptions = useMemo(() => {
    return form.district ? talukasByDistrict[form.district] || [] : []
  }, [form.district])

  const photoSrc = photoPreview || existingPhotoSignedUrl

  useEffect(() => {
    loadExisting()
  }, [])

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  async function loadExisting() {
    setLoading(true)
    setError('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      navigate({ to: '/login' })
      return
    }

    setUserId(user.id)

    const { data: rawData, error: memberError } = await supabase
      .from('members')
      .select(
        [
          'id',
          'status',
          'address',
          'date_of_birth',
          'gender',
          'education',
          'blood_group',
          'emergency_contact_name',
          'emergency_contact_relation',
          'emergency_contact_mobile',
          'declaration_accepted',
          'full_name',
          'father_name',
          'cnic',
          'mobile',
          'district',
          'taluka',
          'profession',
          'caste_branch',
          'photo_url',
        ].join(', '),
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberError) {
      setError(memberError.message)
      setLoading(false)
      return
    }

    const data = rawData as unknown as ExistingMember | null

    if (data) {
      setExistingMember(data)
      setForm(memberToRegisterForm(data))
      setSavedForm(JSON.stringify(memberToRegisterForm(data)))

      if (data.photo_url) {
        const { data: signed } = await supabase.storage
          .from('member-photos')
          .createSignedUrl(data.photo_url, 60 * 60)

        setExistingPhotoSignedUrl(signed?.signedUrl ?? null)
      }
    } else {
      const draft = readRegisterDraft(user.id)

      if (draft) {
        setForm({ ...initialRegisterForm, ...draft.form })
        setSavedForm(JSON.stringify({ ...initialRegisterForm, ...draft.form }))
        setDraftSavedAt(draft.savedAt)
      }
    }

    setLoading(false)
  }

  function updateField<K extends keyof RegisterFormState>(
    field: K,
    value: RegisterFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    if (fieldErrors[field]) {
      setFieldErrors((current) => {
        const next = { ...current }
        delete next[field]
        return next
      })
    }

    setError('')
    setSuccess('')
  }

  function handleDistrictChange(value: string) {
    setForm((current) => ({
      ...current,
      district: value,
      taluka: '',
    }))

    setFieldErrors((current) => {
      const next = { ...current }
      delete next.district
      delete next.taluka
      return next
    })

    setError('')
    setSuccess('')
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    setError('')
    setSuccess('')

    const file = event.target.files?.[0] ?? null
    setPhoto(null)

    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview)
      setPhotoPreview(null)
    }

    if (!file) return

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setFieldErrors((current) => ({
        ...current,
        photo: t('register.photo.hint'),
      }))
      event.target.value = ''
      return
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setFieldErrors((current) => ({
        ...current,
        photo: t('register.photo.hint'),
      }))
      event.target.value = ''
      return
    }

    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))

    setFieldErrors((current) => {
      const next = { ...current }
      delete next.photo
      return next
    })
  }

  function validateCurrentForm() {
    return validateRegisterForm({
      form,
      photo,
      existingMember,
      t,
    })
  }

  function validateStep(stepIndex: number) {
    const step = registerFormSteps[stepIndex]
    const errors = validateCurrentForm()
    const stepErrors: FieldErrors = {}

    step.fields.forEach((field) => {
      if (errors[field]) {
        stepErrors[field] = errors[field]
      }
    })

    setFieldErrors((current) => ({
      ...current,
      ...stepErrors,
    }))

    return stepErrors
  }

  function handleNextStep() {
    const stepErrors = validateStep(currentStep)

    if (Object.keys(stepErrors).length > 0) {
      setError(t('register.error.fixHighlightedContinue'))
      focusFirstInvalidRegisterField()
      return
    }

    setError('')
    setSuccess('')
    setCurrentStep((step) => Math.min(step + 1, registerFormSteps.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handlePreviousStep() {
    setError('')
    setSuccess('')
    setCurrentStep((step) => Math.max(step - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleStepClick(targetStep: number) {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep)
      setError('')
      setSuccess('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const stepErrors = validateStep(currentStep)

    if (Object.keys(stepErrors).length > 0) {
      setError(t('register.error.completeCurrentStep'))
      focusFirstInvalidRegisterField()
      return
    }

    setCurrentStep(targetStep)
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function saveDraft() {
    if (!userId || locked || existingMember) return
    if (!autoSave && !window.confirm(copy.storage)) return

    try {
      const savedAt = new Date().toISOString()

      localStorage.setItem(
        registerDraftKey(userId),
        JSON.stringify({
          version: REGISTER_DRAFT_VERSION,
          savedAt,
          form,
        }),
      )

      setDraftSavedAt(savedAt)
      setSavedForm(JSON.stringify(form))
      setSuccess(t('register.draftSaved'))
      setError('')
    } catch {
      setError(t('register.draftSaveFailed'))
    }
  }

  function clearDraft() {
    if (!userId) return

    try { localStorage.removeItem(registerDraftKey(userId)) } catch { setError(t('register.draftSaveFailed')); return }
    setAutoSave(false)
    setSavedForm(JSON.stringify(initialRegisterForm))
    setDraftSavedAt('')
    setSuccess(t('register.draftCleared'))
    setError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!userId) {
      setError(t('register.error.loginRequired'))
      return
    }

    if (existingMember?.status === 'approved') {
      setError(t('register.error.approvedLocked'))
      return
    }

    const allErrors = validateCurrentForm()
    setFieldErrors(allErrors)

    if (Object.keys(allErrors).length > 0) {
      const firstField = Object.keys(allErrors)[0] as FormField | undefined
      const targetStep = registerFormSteps.findIndex(
        (step) => firstField && step.fields.includes(firstField),
      )

      if (targetStep >= 0) {
        setCurrentStep(targetStep)
      }

      setError(t('register.error.fixHighlightedSubmit'))
      focusFirstInvalidRegisterField()
      return
    }

    setSubmitting(true)

    let photoPath = existingMember?.photo_url ?? ''

    if (photo) {
      const extension = photo.name.split('.').pop()?.toLowerCase() || 'jpg'
      photoPath = `${userId}/photo-${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(photoPath, photo, {
          upsert: true,
          contentType: photo.type || 'image/jpeg',
        })

      if (uploadError) {
        setError(uploadError.message)
        setSubmitting(false)
        return
      }
    }

    const normalizedMobile = normalizeMobile(form.mobile)
    const normalizedEmergencyMobile = normalizeMobile(form.emergencyContactMobile)

    const payload = {
      full_name: form.fullName.trim(),
      father_name: form.fatherName.trim(),
      cnic: form.cnic.trim(),
      mobile: normalizedMobile,
      district: form.district,
      taluka: form.taluka,
      profession: optionalText(form.profession),
      caste_branch: optionalText(form.casteBranch),
      address: form.address.trim(),
      date_of_birth: form.dateOfBirth || null,
      gender: optionalText(form.gender),
      education: optionalText(form.education),
      blood_group: optionalText(form.bloodGroup),
      emergency_contact_name: optionalText(form.emergencyContactName),
      emergency_contact_relation: optionalText(form.emergencyContactRelation),
      emergency_contact_mobile: normalizedEmergencyMobile || null,
      declaration_accepted: form.declarationAccepted,
      photo_url: photoPath,
    }

    if (existingMember) {
      const updatePayload =
        existingMember.status === 'rejected'
          ? {
              ...payload,
              status: 'pending' as const,
              rejection_reason: null,
            }
          : payload

      const { error: updateError } = await supabase
        .from('members')
        .update(updatePayload)
        .eq('id', existingMember.id)

      if (updateError) {
        setError(updateError.message)
        setSubmitting(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('members')
        .insert({
          user_id: userId,
          ...payload,
          status: 'pending',
        })
        .select('id, user_id')
        .single()

      if (insertError) {
        setError(insertError.message)
        setSubmitting(false)
        return
      }
    }

    window.dispatchEvent(new CustomEvent('jas-membership-updated'))
    submitted.current = true
    setAutoSave(false)
    try { localStorage.removeItem(registerDraftKey(userId)) } catch { /* Submission succeeded; storage cleanup must not mask it. */ }
    setDraftSavedAt('')
    setSubmitting(false)

    setSuccess(
      existingMember
        ? t('register.success.updated')
        : t('register.success.submitted'),
    )

    window.setTimeout(() => {
      navigate({ to: '/dashboard' })
    }, 650)
  }

  function getDescriptionIds(field: FormField, hasHint = false) {
    return getRegisterDescriptionIds(field, fieldErrors, hasHint)
  }

  function renderCurrentStep() {
    const baseStepProps = {
      title: currentStepData.title,
      description: currentStepData.description,
      form,
      fieldErrors,
      locked,
      t,
      updateField,
      getDescriptionIds,
    }

    if (currentStep === 0) {
      return <RegisterIdentityStep {...baseStepProps} />
    }

    if (currentStep === 1) {
      return (
        <RegisterAreaStep
          {...baseStepProps}
          handleDistrictChange={handleDistrictChange}
          talukaOptions={talukaOptions}
        />
      )
    }

    if (currentStep === 2) {
      return <RegisterProfileStep {...baseStepProps} />
    }

    if (currentStep === 3) {
      return <RegisterEmergencyStep {...baseStepProps} />
    }

    return (
      <RegisterReviewStep
        title={currentStepData.title}
        description={currentStepData.description}
        form={form}
        fieldErrors={fieldErrors}
        locked={locked}
        photo={photo}
        photoSrc={photoSrc}
        t={t}
        updateField={updateField}
        handlePhotoChange={handlePhotoChange}
        getDescriptionIds={getDescriptionIds}
      />
    )
  }

  if (loading) {
    return (
      <>
        <main className="reg-page" dir={direction}>
          <div className="reg-card">
            <div className="reg-loading">
              <span className="reg-spinner" />
              <p>{t('register.loading')}</p>
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <main className="reg-page" dir={direction}>
        <div className="reg-bg-pattern" aria-hidden="true" />

        <div className="reg-card">
          <div className="reg-header">
            <div className="reg-header-badge">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              {t('register.brand')}
            </div>

            <h1 className="reg-title">{t('register.title')}</h1>

            <p className="reg-subtitle">{t('register.subtitle')}</p>

            <MembershipFeeSummary t={t} />

            <div className="reg-title-line" />
          </div>

          <div className="reg-progress-wrap" aria-label={t('register.progressLabel')}>
            <div className="reg-progress-top">
              <span>
                {t('register.stepOf')
                  .replace('{current}', String(currentStep + 1))
                  .replace('{total}', String(registerFormSteps.length))}
              </span>
              <strong>{t('register.complete').replace('{percent}', String(progressPercent))}</strong>
            </div>

            <div className="reg-progress-track" aria-hidden="true">
              <div
                className="reg-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="reg-step-tabs">
              {localizedSteps.map((step, index) => (
                <button
                  key={step.titleKey}
                  type="button"
                  className={`reg-step-tab ${
                    index === currentStep ? 'is-active' : ''
                  } ${index < currentStep ? 'is-done' : ''}`}
                  onClick={() => handleStepClick(index)}
                  disabled={locked && index !== currentStep}
                  aria-current={index === currentStep ? 'step' : undefined}
                >
                  <span>{index + 1}</span>
                  {step.shortTitle}
                </button>
              ))}
            </div>
          </div>

          {existingMember?.status === 'approved' ? (
            <div className="reg-banner reg-banner--success">
              <span className="reg-banner-icon">✓</span>
              {t('register.approvedBanner')}
            </div>
          ) : null}

          {isPendingEdit ? (
            <div className="reg-banner reg-banner--info">
              <span className="reg-banner-icon">i</span>
              {t('register.pendingEditBanner')}
            </div>
          ) : null}

          {isRejected ? (
            <div className="reg-banner reg-banner--warning">
              <span className="reg-banner-icon">!</span>
              {t('register.rejectedBanner')}
            </div>
          ) : null}

          {!existingMember && !locked ? (
            <section className="reg-banner reg-banner--info" style={{ display: 'block' }}>
              <label style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
                <input type="checkbox" checked={autoSave} onChange={(event) => setAutoSave(event.target.checked)} />
                {copy.autoSave}
              </label>
              <p>{copy.storage}</p>
              <p>{copy.photo}</p>
              {draftSavedAt ? <p role="status">{copy.lastSaved} {new Date(draftSavedAt).toLocaleString(language)} · {copy.expiry}</p> : null}
            </section>
          ) : null}

          {error ? (
            <div className="reg-banner reg-banner--error" role="alert">
              <span className="reg-banner-icon">!</span>
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="reg-banner reg-banner--success" role="status">
              <span className="reg-banner-icon">✓</span>
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="reg-form" noValidate>
            {renderCurrentStep()}

            <div className="reg-actions">
              <div className="reg-actions-left">
                {currentStep > 0 ? (
                  <button
                    type="button"
                    onClick={handlePreviousStep}
                    className="reg-btn-secondary"
                  >
                    ← {t('register.previous')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate({ to: '/dashboard' })}
                    className="reg-btn-secondary"
                  >
                    ← {t('register.backDashboard')}
                  </button>
                )}

                {!locked && !existingMember ? (
                  <button type="button" onClick={saveDraft} className="reg-btn-soft">
                    {t('register.saveDraft')}
                  </button>
                ) : null}

                {draftSavedAt && !locked ? (
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="reg-btn-soft reg-btn-soft--danger"
                  >
                    {t('register.clearDraft')}
                  </button>
                ) : null}
              </div>

              <div className="reg-actions-right">
                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={locked}
                    className="reg-btn-primary"
                  >
                    {t('register.nextStep')} →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting || locked}
                    className="reg-btn-primary"
                  >
                    {submitting ? (
                      <>
                        <span className="reg-spinner reg-spinner--sm" />
                        {t('register.saving')}
                      </>
                    ) : isRejected ? (
                      t('register.resubmit')
                    ) : existingMember ? (
                      t('register.updateForm')
                    ) : (
                      t('register.submitApplication')
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </main>
    </>
  )
}
