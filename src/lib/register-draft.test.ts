// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { initialRegisterForm, readRegisterDraft, registerDraftKey } from './register.validation'
beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-10T12:00:00Z')) })
afterEach(() => vi.useRealTimers())
function save(savedAt: string, form: unknown = { ...initialRegisterForm, fullName: 'Member', declarationAccepted: true }) {
  localStorage.setItem(registerDraftKey('a'), JSON.stringify({ version: 1, savedAt, form }))
}
it('restores text but requires a fresh declaration', () => {
  save('2026-09-09T12:00:00Z')
  expect(readRegisterDraft('a')?.form.fullName).toBe('Member')
  expect(readRegisterDraft('a')?.form.declarationAccepted).toBe(false)
  expect(readRegisterDraft('b')).toBeNull()
})
it.each(['2026-09-03T12:00:00Z', 'bad-date', '2026-09-11T12:00:00Z'])('removes expired or invalid dated drafts: %s', (date) => {
  save(date)
  expect(readRegisterDraft('a')).toBeNull()
  expect(localStorage.getItem(registerDraftKey('a'))).toBeNull()
})
it('ignores unsupported properties and invalid field types', () => {
  save('2026-09-09T12:00:00Z', { fullName: 123, cnic: '123', unexpected: 'value' })
  expect(readRegisterDraft('a')?.form.fullName).toBe('')
  expect(readRegisterDraft('a')?.form).not.toHaveProperty('unexpected')
})
