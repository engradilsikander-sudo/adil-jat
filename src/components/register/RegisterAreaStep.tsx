import { sindhDistricts } from '../../lib/register.validation'
import { Field, FormSection } from './RegisterFormShell'
import type { RegisterStepBaseProps } from './register-step.types'

export function RegisterAreaStep({
  title,
  description,
  form,
  fieldErrors,
  locked,
  updateField,
  handleDistrictChange,
  talukaOptions,
  t,
  getDescriptionIds,
}: RegisterStepBaseProps & {
  handleDistrictChange: (value: string) => void
  talukaOptions: string[]
}) {
  return (
    <FormSection title={title} description={description}>
      <div className="reg-grid">
        <Field
          name="district"
          label={t('register.field.district')}
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
          label={t('register.field.taluka')}
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
          label={t('register.field.address')}
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
