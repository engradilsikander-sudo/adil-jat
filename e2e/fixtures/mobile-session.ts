import { writeFile } from 'node:fs/promises'
import { expect, type Page, type Route, type TestInfo } from '@playwright/test'

const MEMBER_UID = 'b2000000-0000-4000-8000-000000000101'
const ADMIN_UID = 'b2000000-0000-4000-8000-000000000102'

const member = {
  id: 'member-mobile-fixture',
  user_id: MEMBER_UID,
  member_no: 'JAS-2026-10001',
  status: 'approved',
  full_name: 'Mobile Fixture Member',
  father_name: 'Fixture Parent',
  cnic: '44104-1234567-1',
  mobile: '03001234567',
  district: 'Umerkot',
  taluka: 'Kunri',
  profession: 'Teacher',
  caste_branch: 'Fixture',
  photo_url: null,
  rejection_reason: null,
  approved_at: '2026-10-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  address: 'Fixture street, Kunri',
  date_of_birth: '1990-01-01',
  gender: 'Male',
  education: 'Graduate',
  blood_group: 'O+',
  emergency_contact_name: 'Fixture Contact',
  emergency_contact_relation: 'Brother',
  emergency_contact_mobile: '03111234567',
  declaration_accepted: true,
  membership_fee_required: false,
}

const initialNotifications = [
  {
    id: 'notification-mobile-1',
    user_id: MEMBER_UID,
    title: 'Membership update',
    message: 'Your profile is active.',
    category: 'membership',
    related_type: null,
    related_id: null,
    action_url: null,
    is_read: false,
    read_at: null,
    created_at: '2026-11-02T10:00:00Z',
  },
  {
    id: 'notification-mobile-2',
    user_id: MEMBER_UID,
    title: 'General update',
    message: 'A community update is available.',
    category: 'general',
    related_type: null,
    related_id: null,
    action_url: null,
    is_read: false,
    read_at: null,
    created_at: '2026-11-02T09:00:00Z',
  },
]


type Options = { role?: 'member' | 'admin'; language?: 'en' | 'ur' | 'sd'; memberRecord?: boolean }
type FixtureState = { requests: string[]; unexpected: string[]; pageErrors: string[] }
const fixtures = new WeakMap<Page, FixtureState>()
const compact = (value: string) => value.replaceAll(' ', '')
const preferenceKeys = ['web_push_enabled', 'membership_updates', 'program_updates', 'finance_updates', 'general_updates'] as const
const notificationSelect = 'id,user_id,title,message,category,related_type,related_id,action_url,is_read,read_at,created_at'
const preferenceSelect = 'user_id,web_push_enabled,membership_updates,program_updates,finance_updates,general_updates,created_at,updated_at'
const memberSelects = ["full_name,member_no,status", "id,membership_fee_required,status,address,date_of_birth,gender,education,blood_group,emergency_contact_name,emergency_contact_relation,emergency_contact_mobile,declaration_accepted,full_name,father_name,cnic,mobile,district,taluka,profession,caste_branch,photo_url", "id,user_id,member_no,full_name,father_name,cnic,mobile,district,taluka,profession,caste_branch,photo_url,status,rejection_reason,approved_at,created_at,updated_at,address,date_of_birth,gender,education,blood_group,emergency_contact_name,emergency_contact_relation,emergency_contact_mobile,declaration_accepted", "id,user_id,member_no,status,full_name,father_name,cnic,mobile,district,taluka,profession,caste_branch,address,date_of_birth,gender,education,blood_group,emergency_contact_name,emergency_contact_relation,emergency_contact_mobile,photo_url,updated_at"]

// Fail closed: every API call is intercepted, including unknown endpoints. No call
// carrying the synthetic JWT is allowed to fall through to a real backend.
export async function installSyntheticSession(page: Page, options: Options = {}) {
  const admin = options.role === 'admin'
  const userId = admin ? ADMIN_UID : MEMBER_UID
  const user = { id: userId, email: `${admin ? 'admin' : 'member'}-mobile@example.invalid`, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
  const expiresAt = Math.floor(Date.now() / 1000) + 3600
  const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: userId, role: 'authenticated', exp: expiresAt })).toString('base64url'), 'test-only-signature'].join('.')
  const state: FixtureState = { requests: [], unexpected: [], pageErrors: [] }
  fixtures.set(page, state)
  page.on('pageerror', error => state.pageErrors.push(error.message))
  const notifications = initialNotifications.map(row => ({ ...row, user_id: userId, read_at: row.read_at as string | null }))
  const preferences = { user_id: userId, web_push_enabled: true, membership_updates: true, program_updates: true, finance_updates: true, general_updates: true, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
  await page.addInitScript(({ user, token, expiresAt, language }) => {
    localStorage.setItem('jas_language', language)
    localStorage.setItem('jas-app-auth', JSON.stringify({ access_token: token, refresh_token: 'fixture-refresh', expires_in: 3600, expires_at: expiresAt, token_type: 'bearer', user }))
  }, { user, token, expiresAt, language: options.language ?? 'en' })

  const respond = async (route: Route, body: unknown, count?: number) => {
    const method = route.request().method()
    await route.fulfill({ status: method === 'PATCH' ? 204 : method === 'POST' ? 201 : 200, contentType: 'application/json', headers: {
      'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range',
      ...(count === undefined ? {} : { 'content-range': count ? `0-${count - 1}/${count}` : '*/0' }),
    }, body: ['HEAD', 'PATCH', 'POST'].includes(method) ? '' : JSON.stringify(body) })
  }
  const matches = (url: URL, query: Record<string, string>) => {
    const entries = [...url.searchParams.entries()]
    return entries.length === Object.keys(query).length && entries.every(([key, value]) => compact(value) === query[key])
  }
  await page.route(url => ['auth', 'rest', 'storage'].includes(url.pathname.split('/')[1]) && url.pathname.split('/')[2] === 'v1', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const label = `${method} ${url.pathname}${url.search}`
    state.requests.push(label)
    const query = (expected: Record<string, string>) => matches(url, expected)
    const scoped = (select: string, extra: Record<string, string> = {}) => query({ select, user_id: `eq.${userId}`, ...extra })
    try {
      if (url.pathname === '/auth/v1/user' && method === 'GET' && query({})) {
        expect(request.headers().authorization).toBe(`Bearer ${token}`)
        await respond(route, user); return
      }
      // Fresh sessions need neither token refresh nor sign-out. Both must fail
      // explicitly if app/library behavior changes; no generic token success reply.
      if (url.pathname.startsWith('/auth/v1/')) throw new Error('Only GET /auth/v1/user is expected')
      // No Storage calls are expected: all supplied photos are null and no upload
      // scenario is exercised. Do not fabricate signed URLs or upload success.
      if (url.pathname.startsWith('/storage/v1/')) throw new Error('No Storage operation is expected')
      // The Finance navigation gate performs one read-only permission RPC.
      if (url.pathname === '/rest/v1/rpc/current_user_can_manage_finance' && method === 'POST' && query({})) {
        expect(request.postDataJSON() ?? {}).toEqual({})
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(admin) }); return
      }
      // All other RPCs remain unexpected.
      if (url.pathname.startsWith('/rest/v1/rpc/')) throw new Error('No RPC is expected')
      const table = url.pathname.slice('/rest/v1/'.length)
      if (method === 'GET') {
        if (table === 'user_roles' && (scoped('role') || scoped('role', { role: 'in.(admin,super_admin,membership_admin,education_admin,health_admin,employment_admin,ration_admin,welfare_admin,finance_admin)', limit: '1' }))) {
          await respond(route, admin ? [{ role: 'super_admin' }] : [], admin ? 1 : 0); return
        }
        if (table === 'members' && memberSelects.some(select => scoped(select))) {
          // maybeSingle GET requests use an array; PostgREST-js converts [] to null.
          await respond(route, admin || options.memberRecord === false ? [] : [member], admin || options.memberRecord === false ? 0 : 1); return
        }
        if (table === 'membership_payments' && query({ select: '*', member_id: `eq.${member.id}` })) {
          await respond(route, [], 0); return
        }
        if (table === 'notification_preferences' && (scoped(preferenceSelect) || scoped('web_push_enabled'))) {
          await respond(route, [preferences], 1); return
        }
        if (table === 'push_subscriptions' && scoped('id,user_id,endpoint,p256dh,auth,user_agent,device_label,enabled,failure_count,last_seen_at,last_success_at,last_failure_at,disabled_at,disabled_reason,created_at,updated_at', { order: 'last_seen_at.desc' })) {
          await respond(route, [], 0); return
        }
        if (table === 'profile_update_requests' && scoped('*', { order: 'created_at.desc', limit: '20' })) {
          await respond(route, [], 0); return
        }
        if (table === 'notifications' && (scoped(notificationSelect, { order: 'created_at.desc', limit: '8' }) || scoped(notificationSelect, { order: 'created_at.desc', offset: '0', limit: '50' }))) {
          await respond(route, notifications, notifications.length); return
        }
        if (table === 'finance_donations' && query({ select: 'id,donation_no,amount,purpose,status,approved_at,created_at', donor_user_id: `eq.${userId}`, order: 'created_at.desc', limit: '20' })) {
          await respond(route, [], 0); return
        }
        if (table === 'program_applications' && query({ select: 'id,application_no,program_key,status,applicant_name,membership_no,district,taluka,approved_amount,admin_remarks,created_at,submitted_at,updated_at', applicant_user_id: `eq.${userId}`, order: 'created_at.desc', limit: '20' })) {
          await respond(route, [], 0); return
        }
        if (admin && table === 'program_applications' && query({ select: 'id,application_no,applicant_name,membership_no,relationship_to_member,phone,district,taluka,details,status,assigned_admin_id,admin_remarks,approved_amount,submitted_at,created_at', program_key: 'eq.education', order: 'created_at.desc,id.asc', offset: '0', limit: '500' })) {
          await respond(route, [], 0); return
        }
      }
      if (method === 'HEAD' && table === 'notifications' && scoped('id', { is_read: 'eq.false' })) {
        await respond(route, null, notifications.filter(row => !row.is_read).length); return
      }
      if (method === 'PATCH' && table === 'notifications' && query({ user_id: `eq.${userId}`, is_read: 'eq.false', id: 'in.(notification-mobile-1,notification-mobile-2)' })) {
        const body = request.postDataJSON() as Record<string, unknown>
        expect(Object.keys(body).sort()).toEqual(['is_read', 'read_at'])
        expect(body.is_read).toBe(true)
        expect(typeof body.read_at).toBe('string')
        expect(Number.isFinite(Date.parse(body.read_at as string))).toBe(true)
        notifications.forEach(row => { row.is_read = true; row.read_at = body.read_at as string })
        await respond(route, null); return
      }
      if (method === 'POST' && table === 'notification_preferences' && query({ on_conflict: 'user_id' })) {
        const body = request.postDataJSON() as Record<string, unknown>
        expect(Object.keys(body).sort()).toEqual(['user_id', ...preferenceKeys].sort())
        expect(body.user_id).toBe(userId)
        for (const key of preferenceKeys) { expect(typeof body[key]).toBe('boolean'); preferences[key] = body[key] as boolean }
        await respond(route, null); return
      }
      throw new Error('No matching method/table/query contract')
    } catch (error) {
      const message = `Unexpected synthetic API request: ${label}: ${error instanceof Error ? error.message : String(error)}`
      state.unexpected.push(message)
      await route.fulfill({ status: 501, contentType: 'application/json', body: JSON.stringify({ message }) })
    }
  })
  return state
}

export async function verifySyntheticSession(page: Page, testInfo: TestInfo) {
  const state = fixtures.get(page)
  if (!state) return
  const attachJSON = async (name: string, data: unknown) => {
    const path = testInfo.outputPath(`${name}.json`)
    await writeFile(path, JSON.stringify(data, null, 2))
    await testInfo.attach(name, { path, contentType: 'application/json' })
  }
  if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
    const bootstrap = await page.evaluate(async () => ({
      path: location.pathname,
      documentReady: document.readyState,
      language: document.documentElement.lang,
      mainText: document.querySelector('main')?.textContent,
      serviceWorkerReady: 'serviceWorker' in navigator
        ? await Promise.race([navigator.serviceWorker.ready.then(() => 'resolved'), new Promise<string>(resolve => setTimeout(() => resolve('pending after 250ms observation'), 250))])
        : 'unsupported',
    }))
    await attachJSON('ui-bootstrap', bootstrap)
  }
  await attachJSON('synthetic-api-contracts', state)
  expect(state.unexpected, 'Synthetic API contract violations (see attached Auth/REST/Storage request log)').toEqual([])
  expect(state.pageErrors, 'Browser runtime errors').toEqual([])
}
