import type { ChangeEvent } from 'react'
import type { TranslationKey } from '../../lib/i18n'
import type {
  FieldErrors,
  FormField,
  RegisterFormState,
} from '../../lib/register.validation'
import { FormSection } from './RegisterFormShell'

export function RegisterReviewStep({
  title,
  description,
  form,
  fieldErrors,
  locked,
  photo,
  photoSrc,
  t,
  updateField,
  handlePhotoChange,
  getDescriptionIds,
}: {
  title: string
  description: string
  form: RegisterFormState
  fieldErrors: FieldErrors
  locked: boolean
  photo: File | null
  photoSrc: string | null
  t: (key: TranslationKey) => string
  updateField: <K extends keyof RegisterFormState>(
    field: K,
    value: RegisterFormState[K],
  ) => void
  handlePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void
  getDescriptionIds: (field: FormField, hasHint?: boolean) => string | undefined
}) {
  return (
    <FormSection title={title} description={description}>
      <div className="reg-photo-row">
        <div className="reg-photo-preview">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={t('register.photo.alt')}
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
              <span>{t('register.photo.none')}</span>
            </div>
          )}
        </div>

        <div className="reg-photo-upload">
          <label
            className={`reg-upload-btn ${
              locked ? 'is-disabled' : 'cursor-pointer'
            }`}
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
            {photo ? photo.name : t('register.photo.choose')}
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
            {t('register.photo.hint')}
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
          onChange={(event) => updateField('declarationAccepted', event.target.checked)}
          disabled={locked}
          className="reg-checkbox"
          aria-invalid={Boolean(fieldErrors.declarationAccepted)}
          aria-describedby={getDescriptionIds('declarationAccepted')}
        />
        <span>{t('register.declaration')}</span>
      </label>

      {fieldErrors.declarationAccepted ? (
        <p id="declarationAccepted-error" className="reg-error-text">
          {fieldErrors.declarationAccepted}
        </p>
      ) : null}
    </FormSection>
  )
}
