import { formatCnicInput, formatMobileInput } from '../../lib/shared/formatters'
import { Field, FormSection } from './RegisterFormShell'
import type { RegisterStepBaseProps } from './register-step.types'

export function RegisterIdentityStep({
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
          name="fullName"
          label={t('register.field.fullName')}
          required
          error={fieldErrors.fullName}
        >
          <input
            id="fullName"
            value={form.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            disabled={locked}
            className="reg-input"
            placeholder="Enter full name"
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={getDescriptionIds('fullName')}
          />
        </Field>

        <Field
          name="fatherName"
          label={t('register.field.fatherName')}
          required
          error={fieldErrors.fatherName}
        >
          <input
            id="fatherName"
            value={form.fatherName}
            onChange={(event) => updateField('fatherName', event.target.value)}
            disabled={locked}
            className="reg-input"
            placeholder="Enter father's name"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.fatherName)}
            aria-describedby={getDescriptionIds('fatherName')}
          />
        </Field>

        <Field
          name="cnic"
          label={t('register.field.cnic')}
          required
          hint={t('register.hint.cnic')}
          error={fieldErrors.cnic}
        >
          <input
            id="cnic"
            dir="ltr"
            value={form.cnic}
            onChange={(event) => updateField('cnic', formatCnicInput(event.target.value))}
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
          label={t('register.field.mobile')}
          required
          hint={t('register.hint.mobile')}
          error={fieldErrors.mobile}
        >
          <input
            id="mobile"
            dir="ltr"
            value={form.mobile}
            onChange={(event) => updateField('mobile', formatMobileInput(event.target.value))}
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
