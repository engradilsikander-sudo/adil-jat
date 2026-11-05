// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { I18nProvider } from '../../lib/i18n'
import { ConnectionNotice } from './ConnectionNotice'

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: online })
  act(() => window.dispatchEvent(new Event(online ? 'online' : 'offline')))
}
function mount() { return render(<I18nProvider><ConnectionNotice /></I18nProvider>) }
beforeEach(() => { localStorage.clear(); Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true }) })
afterEach(() => { cleanup() })

it('shows no notice on a normal online load, then announces offline access without reloading', async () => {
  mount()
  expect(screen.queryByRole('status')).toBeNull()
  setOnline(false)
  expect(await screen.findByText('You appear to be offline')).toBeTruthy()
  expect(screen.getByText(/Saved pages may still be visible/)).toBeTruthy()
})

it('explains reconnection without resubmitting and allows dismissal', async () => {
  mount()
  setOnline(false)
  await screen.findByText('You appear to be offline')
  setOnline(true)
  expect(await screen.findByText('Your device reports a connection')).toBeTruthy()
  expect(screen.getByText(/Nothing was submitted automatically/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss connection notice' }))
  expect(screen.queryByRole('status')).toBeNull()
})

it('keeps Urdu/Sindhi text in the correct direction', async () => {
  localStorage.setItem('jas_language', 'sd')
  setOnline(false)
  mount()
  await waitFor(() => expect(screen.getByTestId('jas-connection-notice').getAttribute('dir')).toBe('rtl'))
  expect(screen.getByText('لڳي ٿو انٽرنيٽ ڪنيڪشن بند آهي')).toBeTruthy()
})
