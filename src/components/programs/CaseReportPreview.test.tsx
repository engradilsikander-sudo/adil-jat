// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { I18nProvider } from '../../lib/i18n'
import type { CaseReportData } from '../../lib/programs/case-report'
import { CaseReportPreview } from './CaseReportPreview'
const report: CaseReportData = {
  type: 'health', title: 'Health Case Report', reference: 'HC-101', generatedAt: '2026-11-04', confidential: 'Restricted medical record',
  fields: [['Patient Name', '<img src=x onerror=alert(1)>'], ['Disease', 'بيماري']],
  sections: [{ title: 'Close Notes', text: '<script>alert(1)</script>' }],
  documents: [{ label: 'Report', status: 'Verified', note: '<svg onload=alert(1)>' }],
}
beforeEach(() => { localStorage.clear(); document.body.style.overflow = '' })
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.style.overflow = '' })
function mount(data: CaseReportData | null = report, onClose = vi.fn()) {
  const view = render(<I18nProvider><CaseReportPreview report={data} onClose={onClose} /></I18nProvider>)
  return { ...view, onClose }
}

it('has no preview when nothing has been opened', () => {
  mount(null)
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('renders an accessible report with confidentiality notice and saved-value warning', () => {
  mount()
  expect(screen.getByRole('dialog', { name: 'Case report preview' })).toBeTruthy()
  expect(screen.getByText('Restricted medical record')).toBeTruthy()
  expect(screen.getByText(/last saved case data/)).toBeTruthy()
  expect(screen.getByRole('table', { name: 'health case summary' })).toBeTruthy()
  expect(document.body.style.overflow).toBe('hidden')
})

it('renders malicious case values as text without any injected DOM elements', () => {
  mount()
  const root = document.querySelector('#jas-case-report-portal')!
  expect(root.querySelector('script, img, svg')).toBeNull()
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy()
  expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy()
  expect(screen.getByText('<svg onload=alert(1)>')).toBeTruthy()
  expect(screen.getByText('بيماري')).toBeTruthy()
})

it('uses native print rather than a popup or sensitive document URL', () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
  const open = vi.spyOn(window, 'open').mockImplementation(() => null)
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Print / Save as PDF' }))
  expect(print).toHaveBeenCalledOnce()
  expect(open).not.toHaveBeenCalled()
  expect(document.querySelectorAll('#jas-case-report-portal a[href^="blob:"],#jas-case-report-portal a[download]')).toHaveLength(0)
})

it('shows a helpful error while keeping the preview open if print is unsupported', () => {
  const previous = Object.getOwnPropertyDescriptor(window, 'print')
  Object.defineProperty(window, 'print', { value: undefined, configurable: true, writable: true })
  try {
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Print / Save as PDF' }))
    expect(screen.getByRole('alert').textContent).toMatch(/Printing is unavailable/)
    expect(screen.getByRole('dialog')).toBeTruthy()
  } finally { if (previous) Object.defineProperty(window, 'print', previous) }
})

it('returns focus to the triggering control and unlocks body after close', () => {
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  trigger.focus()
  const onClose = vi.fn()
  const view = mount(report, onClose)
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close report preview' }))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledOnce()
  view.rerender(<I18nProvider><CaseReportPreview report={null} onClose={onClose} /></I18nProvider>)
  expect(document.activeElement).toBe(trigger)
  expect(document.body.style.overflow).toBe('')
  trigger.remove()
})

it('loops keyboard tab focus inside the preview controls', () => {
  mount()
  const close = screen.getByRole('button', { name: 'Close report preview' })
  const print = screen.getByRole('button', { name: 'Print / Save as PDF' })
  close.focus()
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
  expect(document.activeElement).toBe(print)
  fireEvent.keyDown(document, { key: 'Tab' })
  expect(document.activeElement).toBe(close)
})

it('handles empty medical documents and welfare without a medical document section', () => {
  const view = mount({ ...report, documents: [] })
  expect(screen.getByText('No documents uploaded.')).toBeTruthy()
  view.rerender(<I18nProvider><CaseReportPreview report={{ ...report, type: 'welfare', documents: undefined }} onClose={vi.fn()} /></I18nProvider>)
  expect(screen.queryByRole('table', { name: 'Document Verification' })).toBeNull()
})

it('provides Urdu mobile PDF instructions and RTL controls', async () => {
  localStorage.setItem('jas_language', 'ur')
  mount()
  const print = await screen.findByRole('button', { name: 'پرنٹ / PDF محفوظ کریں' })
  expect(print).toBeTruthy()
  expect(screen.getByRole('dialog').getAttribute('dir')).toBe('rtl')
})
