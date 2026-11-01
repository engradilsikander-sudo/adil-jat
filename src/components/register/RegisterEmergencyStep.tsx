import { formatMobileInput } from '../../lib/shared/formatters'
import { Field, FormSection } from './RegisterFormShell'
import type { RegisterStepBaseProps } from './register-step.types'

export function RegisterEmergencyStep({
  title,
  description,
  form,
  fieldErrors,
  locked,
  t,
  updateField,
  getDescriptionIds,
}: RegisterStepBaseProps) {
  return (
    <FormSection title={title} description={description}>
      <div className="reg-grid">
        <Field
          name="emergencyContactName"
          label={t('register.field.contactName')}
          required
          error={fieldErrors.emergencyContactName}
        >
          <input
            id="emergencyContactName"
            value={form.emergencyContactName}
            onChange={(event) => updateField('emergencyContactName', event.target.value)}
            disabled={locked}
            className="reg-input"
            placeholder="Full name"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.emergencyContactName)}
            aria-describedby={getDescriptionIds('emergencyContactName')}
          />
        </Field>

        <Field
          name="emergencyContactRelation"
          label={t('register.field.relation')}
          required
          error={fieldErrors.emergencyContactRelation}
        >
          <input
            id="emergencyContactRelation"
            value={form.emergencyContactRelation}
            onChange={(event) => updateField('emergencyContactRelation', event.target.value)}
            disabled={locked}
            className="reg-input"
            placeholder={t('register.placeholder.relation')}
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.emergencyContactRelation)}
            aria-describedby={getDescriptionIds('emergencyContactRelation')}
          />
        </Field>

        <Field
          name="emergencyContactMobile"
          label={t('register.field.contactMobile')}
          required
          hint={t('register.hint.emergencyMobile')}
          error={fieldErrors.emergencyContactMobile}
        >
          <input
            id="emergencyContactMobile"
            dir="ltr"
            value={form.emergencyContactMobile}
            onChange={(event) =>
              updateField('emergencyContactMobile', formatMobileInput(event.target.value))
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
