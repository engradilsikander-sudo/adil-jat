import { bloodGroupOptions, genderOptions } from '../../lib/register.validation'
import { todayDate } from '../../lib/shared/formatters'
import { Field, FormSection } from './RegisterFormShell'
import type { RegisterStepBaseProps } from './register-step.types'

export function RegisterProfileStep({
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
          name="profession"
          label={t('register.field.profession')}
          required
          error={fieldErrors.profession}
        >
          <input
            id="profession"
            value={form.profession}
            onChange={(event) => updateField('profession', event.target.value)}
            disabled={locked}
            className="reg-input"
            placeholder={t('register.placeholder.profession')}
            autoComplete="organization-title"
            aria-invalid={Boolean(fieldErrors.profession)}
            aria-describedby={getDescriptionIds('profession')}
          />
        </Field>

        <Field
          name="casteBranch"
          label={t('register.field.casteBranch')}
          required
          error={fieldErrors.casteBranch}
        >
          <input
            id="casteBranch"
            value={form.casteBranch}
            onChange={(event) => updateField('casteBranch', event.target.value)}
            disabled={locked}
            className="reg-input"
            placeholder="Enter caste branch"
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.casteBranch)}
            aria-describedby={getDescriptionIds('casteBranch')}
          />
        </Field>

        <Field
          name="dateOfBirth"
          label={t('register.field.dateOfBirth')}
          required
          error={fieldErrors.dateOfBirth}
        >
          <input
            id="dateOfBirth"
            dir="ltr"
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

        <Field
          name="gender"
          label={t('register.field.gender')}
          required
          error={fieldErrors.gender}
        >
          <select
            id="gender"
            value={form.gender}
            onChange={(event) => updateField('gender', event.target.value)}
            disabled={locked}
            className="reg-input reg-select"
            aria-invalid={Boolean(fieldErrors.gender)}
            aria-describedby={getDescriptionIds('gender')}
          >
            <option value="">Select gender</option>
            {genderOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>

        <Field
          name="education"
          label={t('register.field.education')}
          required
          error={fieldErrors.education}
        >
          <input
            id="education"
            value={form.education}
            onChange={(event) => updateField('education', event.target.value)}
            disabled={locked}
            className="reg-input"
            placeholder={t('register.placeholder.education')}
            autoComplete="off"
            aria-invalid={Boolean(fieldErrors.education)}
            aria-describedby={getDescriptionIds('education')}
          />
        </Field>

        <Field
          name="bloodGroup"
          label={t('register.field.bloodGroup')}
          required
          error={fieldErrors.bloodGroup}
        >
          <select
            id="bloodGroup"
            dir="ltr"
            value={form.bloodGroup}
            onChange={(event) => updateField('bloodGroup', event.target.value)}
            disabled={locked}
            className="reg-input reg-select"
            aria-invalid={Boolean(fieldErrors.bloodGroup)}
            aria-describedby={getDescriptionIds('bloodGroup')}
          >
            <option value="">Select blood group</option>
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
