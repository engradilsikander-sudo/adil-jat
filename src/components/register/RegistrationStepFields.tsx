import type { ChangeEvent, ReactNode } from 'react'
import {
  bloodGroupOptions,
  genderOptions,
  sindhDistricts,
} from '../../lib/register/registration-options'
import {
  formatCnicInput,
  formatMobileInput,
  todayDate,
} from '../../lib/shared/formatters'

export type RegistrationFormValues = {
  fullName: string
  fatherName: string
  cnic: string
  mobile: string
  district: string
  taluka: string
  profession: string
  casteBranch: string
  address: string
  dateOfBirth: string
  gender: string
  education: string
  bloodGroup: string
  emergencyContactName: string
  emergencyContactRelation: string
  emergencyContactMobile: string
  declarationAccepted: boolean
}

export type RegistrationFormField = keyof RegistrationFormValues | 'photo'
export type RegistrationFieldErrors = Partial<Record<RegistrationFormField, string>>

type RegistrationStepFieldsProps = {
  currentStep: number
  title: string
  description: string
  form: RegistrationFormValues
  fieldErrors: RegistrationFieldErrors
  locked: boolean
  photo: File | null
  photoSrc: string | null
  talukaOptions: string[]
  updateField: <Field extends keyof RegistrationFormValues>(
    field: Field,
    value: RegistrationFormValues[Field],
  ) => void
  handleDistrictChange: (value: string) => void
  handlePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void
  getDescriptionIds: (field: RegistrationFormField, hasHint?: boolean) => string | undefined
}

export function RegistrationStepFields({
  currentStep,
  title,
  description,
  form,
  fieldErrors,
  locked,
  photo,
  photoSrc,
  talukaOptions,
  updateField,
  handleDistrictChange,
  handlePhotoChange,
  getDescriptionIds,
}: RegistrationStepFieldsProps) {
  if (currentStep === 0) {
    return (
      <FormSection title={title} description={description}>
        <div className="reg-grid">
          <Field
            name="fullName"
            label="Full Name"
            required
            error={fieldErrors.fullName}
          >
            <input
              id="fullName"
              value={form.fullName}
              onChange={(event) => updateField('fullName', event.target.value)}
              disabled={locked}
              className="reg-input"
              placeholder="Enter your full name"
              autoComplete="name"
              aria-invalid={Boolean(fieldErrors.fullName)}
              aria-describedby={getDescriptionIds('fullName')}
            />
          </Field>

          <Field
            name="fatherName"
            label="Father Name"
            required
            error={fieldErrors.fatherName}
          >
            <input
              id="fatherName"
              value={form.fatherName}
              onChange={(event) => updateField('fatherName', event.target.value)}
              disabled={locked}
              className="reg-input"
              placeholder="Enter father name"
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.fatherName)}
              aria-describedby={getDescriptionIds('fatherName')}
            />
          </Field>

          <Field
            name="cnic"
            label="CNIC"
            required
            hint="Format: 12345-1234567-1"
            error={fieldErrors.cnic}
          >
            <input
              id="cnic"
              value={form.cnic}
              onChange={(event) =>
                updateField('cnic', formatCnicInput(event.target.value))
              }
              disabled={locked}
              className="reg-input"
              placeholder="12345-1234567-1"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={Boolean(fieldErrors.cnic)}
              aria-describedby={getDescriptionIds('cnic', true)}
            />
          </Field>

          <Field
            name="mobile"
            label="Mobile Number"
            required
            hint="Example: 03001234567 or +923001234567"
            error={fieldErrors.mobile}
          >
            <input
              id="mobile"
              value={form.mobile}
              onChange={(event) =>
                updateField('mobile', formatMobileInput(event.target.value))
              }
              disabled={locked}
              className="reg-input"
              placeholder="03001234567"
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.mobile)}
              aria-describedby={getDescriptionIds('mobile', true)}
            />
          </Field>
        </div>
      </FormSection>
    )
  }

  if (currentStep === 1) {
    return (
      <FormSection title={title} description={description}>
        <div className="reg-grid">
          <Field
            name="district"
            label="District"
            required
            error={fieldErrors.district}
          >
            <select
              id="district"
              value={form.district}
              onChange={(event) => handleDistrictChange(event.target.value)}
              disabled={locked}
              className="reg-input reg-select"
              aria-invalid={Boolean(fieldErrors.district)}
              aria-describedby={getDescriptionIds('district')}
            >
              <option value="">Select district</option>
              {sindhDistricts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field
            name="taluka"
            label="Taluka / Town / Sub-division"
            required
            error={fieldErrors.taluka}
          >
            <select
              id="taluka"
              value={form.taluka}
              onChange={(event) => updateField('taluka', event.target.value)}
              disabled={locked || !form.district}
              className="reg-input reg-select"
              aria-invalid={Boolean(fieldErrors.taluka)}
              aria-describedby={getDescriptionIds('taluka')}
            >
              <option value="">
                {form.district ? 'Select taluka' : 'Select district first'}
              </option>
              {talukaOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field
            name="address"
            label="Complete Residential Address"
            required
            error={fieldErrors.address}
            className="span-2"
          >
            <textarea
              id="address"
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
              disabled={locked}
              className="reg-input reg-textarea"
              placeholder="House no., street, area, taluka, district"
              autoComplete="street-address"
              aria-invalid={Boolean(fieldErrors.address)}
              aria-describedby={getDescriptionIds('address')}
            />
          </Field>
        </div>
      </FormSection>
    )
  }

  if (currentStep === 2) {
    return (
      <FormSection title={title} description={description}>
        <div className="reg-grid">
          <Field name="profession" label="Profession">
            <input
              id="profession"
              value={form.profession}
              onChange={(event) => updateField('profession', event.target.value)}
              disabled={locked}
              className="reg-input"
              placeholder="e.g. Teacher, Farmer, Business"
              autoComplete="organization-title"
            />
          </Field>

          <Field name="casteBranch" label="Caste Branch">
            <input
              id="casteBranch"
              value={form.casteBranch}
              onChange={(event) => updateField('casteBranch', event.target.value)}
              disabled={locked}
              className="reg-input"
              placeholder="Optional"
              autoComplete="off"
            />
          </Field>

          <Field
            name="dateOfBirth"
            label="Date of Birth"
            error={fieldErrors.dateOfBirth}
          >
            <input
              id="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(event) => updateField('dateOfBirth', event.target.value)}
              disabled={locked}
              className="reg-input"
              max={todayDate()}
              aria-invalid={Boolean(fieldErrors.dateOfBirth)}
              aria-describedby={getDescriptionIds('dateOfBirth')}
            />
          </Field>

          <Field name="gender" label="Gender">
            <select
              id="gender"
              value={form.gender}
              onChange={(event) => updateField('gender', event.target.value)}
              disabled={locked}
              className="reg-input reg-select"
            >
              <option value="">— Optional —</option>
              {genderOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <Field name="education" label="Education / Qualification">
            <input
              id="education"
              value={form.education}
              onChange={(event) => updateField('education', event.target.value)}
              disabled={locked}
              className="reg-input"
              placeholder="e.g. Matric, BA, MBA"
              autoComplete="off"
            />
          </Field>

          <Field name="bloodGroup" label="Blood Group">
            <select
              id="bloodGroup"
              value={form.bloodGroup}
              onChange={(event) => updateField('bloodGroup', event.target.value)}
              disabled={locked}
              className="reg-input reg-select"
            >
              <option value="">— Optional —</option>
              {bloodGroupOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </FormSection>
    )
  }

  if (currentStep === 3) {
    return (
      <FormSection title={title} description={description}>
        <div className="reg-grid">
          <Field name="emergencyContactName" label="Contact Name">
            <input
              id="emergencyContactName"
              value={form.emergencyContactName}
              onChange={(event) =>
                updateField('emergencyContactName', event.target.value)
              }
              disabled={locked}
              className="reg-input"
              placeholder="Full name"
              autoComplete="off"
            />
          </Field>

          <Field name="emergencyContactRelation" label="Relation">
            <input
              id="emergencyContactRelation"
              value={form.emergencyContactRelation}
              onChange={(event) =>
                updateField('emergencyContactRelation', event.target.value)
              }
              disabled={locked}
              className="reg-input"
              placeholder="e.g. Brother, Father"
              autoComplete="off"
            />
          </Field>

          <Field
            name="emergencyContactMobile"
            label="Contact Mobile"
            hint="Optional, e.g. 03001234567"
            error={fieldErrors.emergencyContactMobile}
          >
            <input
              id="emergencyContactMobile"
              value={form.emergencyContactMobile}
              onChange={(event) =>
                updateField(
                  'emergencyContactMobile',
                  formatMobileInput(event.target.value),
                )
              }
              disabled={locked}
              className="reg-input"
              placeholder="03001234567"
              inputMode="tel"
              autoComplete="tel"
              aria-invalid={Boolean(fieldErrors.emergencyContactMobile)}
              aria-describedby={getDescriptionIds('emergencyContactMobile', true)}
            />
          </Field>
        </div>
      </FormSection>
    )
  }

  return (
    <FormSection title={title} description={description}>
      <div className="reg-photo-row">
        <div className="reg-photo-preview">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt="Selected member photo preview"
              className="reg-photo-img"
            />
          ) : (
            <div className="reg-photo-placeholder" aria-hidden="true">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              <span>No photo</span>
            </div>
          )}
        </div>

        <div className="reg-photo-upload">
          <label
            className={`reg-upload-btn ${locked ? 'is-disabled' : 'cursor-pointer'}`}
            htmlFor="photo"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {photo ? photo.name : 'Choose photo'}
          </label>

          <input
            id="photo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handlePhotoChange}
            disabled={locked}
            className="reg-sr-only"
            aria-invalid={Boolean(fieldErrors.photo)}
            aria-describedby={getDescriptionIds('photo', true)}
          />

          <p id="photo-hint" className="reg-upload-hint">
            PNG, JPG or WebP · Passport style · Clear face visible · Max 2MB
          </p>

          {fieldErrors.photo ? (
            <p id="photo-error" className="reg-error-text">
              {fieldErrors.photo}
            </p>
          ) : null}
        </div>
      </div>

      <label
        className={`reg-declaration ${
          form.declarationAccepted ? 'reg-declaration--checked' : ''
        }`}
      >
        <input
          type="checkbox"
          checked={form.declarationAccepted}
          onChange={(event) =>
            updateField('declarationAccepted', event.target.checked)
          }
          disabled={locked}
          className="reg-checkbox"
          aria-invalid={Boolean(fieldErrors.declarationAccepted)}
          aria-describedby={getDescriptionIds('declarationAccepted')}
        />
        <span>
          I confirm that the provided information is true and authorize{' '}
          <strong>Jatt Alliance Sindh</strong> to review it for membership
          approval and digital card issuance.
        </span>
      </label>

      {fieldErrors.declarationAccepted ? (
        <p id="declarationAccepted-error" className="reg-error-text">
          {fieldErrors.declarationAccepted}
        </p>
      ) : null}
    </FormSection>
  )
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="reg-section">
      <div className="reg-section-header">
        <div>
          <h2 className="reg-section-title">{title}</h2>
          <p className="reg-section-desc">{description}</p>
        </div>
      </div>

      <div className="reg-section-body">{children}</div>
    </section>
  )
}

function Field({
  name,
  label,
  children,
  required,
  hint,
  error,
  className = '',
}: {
  name: RegistrationFormField
  label: string
  children: ReactNode
  required?: boolean
  hint?: string
  error?: string
  className?: string
}) {
  return (
    <div className={`reg-field ${className}`}>
      <label htmlFor={name} className="reg-label">
        {label}
        {required ? (
          <span className="reg-required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : null}
      </label>

      {hint ? (
        <span id={`${name}-hint`} className="reg-hint">
          {hint}
        </span>
      ) : null}

      {children}

      {error ? (
        <p id={`${name}-error`} className="reg-error-text">
          {error}
        </p>
      ) : null}
    </div>
  )
}
