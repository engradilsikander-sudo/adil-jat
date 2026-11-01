import type { TranslationKey } from '../../lib/i18n'
import type {
  FieldErrors,
  FormField,
  RegisterFormState,
} from '../../lib/register.validation'

export type RegisterStepShell = {
  title: string
  description: string
}

export type RegisterStepBaseProps = RegisterStepShell & {
  form: RegisterFormState
  fieldErrors: FieldErrors
  locked: boolean
  t: (key: TranslationKey) => string
  updateField: <K extends keyof RegisterFormState>(
    field: K,
    value: RegisterFormState[K],
  ) => void
  getDescriptionIds: (field: FormField, hasHint?: boolean) => string | undefined
}
