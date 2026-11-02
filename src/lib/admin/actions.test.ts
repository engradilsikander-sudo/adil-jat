import { beforeEach, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
const memberUpdate = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    validator: () => ({ handler: (fn: unknown) => fn }),
  }),
}))

vi.mock('../supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'reviewer@example.com' } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === 'user_roles') {
        const query = {
          select: () => query,
          eq: () => query,
          in: () => query,
          limit: () => query,
          maybeSingle: async () => ({ data: { id: 'role-a', role: 'membership_admin' }, error: null }),
        }
        return query
      }

      if (table === 'members') {
        return {
          update: memberUpdate,
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
            id: '11111111-1111-4111-8111-111111111111', status: 'pending', full_name: 'Member A'
          }, error: null }) }) }),
        }
      }

      return {
        insert: async () => ({ error: null }),
      }
    },
    rpc,
  }),
}))

import { updateMemberApplicationAction, approveMemberAction, rejectMemberAction } from './actions'

const memberId = '11111111-1111-4111-8111-111111111111'
const reviewerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const payload = {
  full_name: 'Member A',
  father_name: 'Father A',
  cnic: '44404-6886551-3',
  mobile: '03001234567',
  district: 'Umerkot',
  taluka: 'Kunri',
  address: 'Kunri, Umerkot',
  date_of_birth: '1990-01-01',
  gender: 'Male',
  education: 'Graduate',
  blood_group: 'B+',
  profession: 'Business',
  caste_branch: null,
  emergency_contact_name: null,
  emergency_contact_relation: null,
  emergency_contact_mobile: null,
  declaration_accepted: true,
  photo_url: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/admin-photo.jpg',
}

beforeEach(() => {
  rpc.mockReset()
  memberUpdate.mockReset()
  rpc.mockResolvedValue({ data: { id: memberId, ...payload }, error: null })
})

it('routes privileged member edits through the scoped database RPC instead of a direct service-role update', async () => {
  const handler = updateMemberApplicationAction as unknown as (args: {
    data: { memberId: string; accessToken: string; payload: typeof payload }
  }) => Promise<{ ok: boolean; memberId: string; updatedBy: string }>

  const result = await handler({
    data: { memberId, accessToken: 'valid-access-token', payload },
  })

  expect(rpc).toHaveBeenCalledTimes(1)
  expect(rpc).toHaveBeenCalledWith('update_member_application_as_reviewer', {
    _member_id: memberId,
    _reviewed_by: reviewerId,
    _payload: payload,
  })
  expect(memberUpdate).not.toHaveBeenCalled()
  expect(result).toMatchObject({ ok: true, memberId, updatedBy: reviewerId })
})

it('fails closed when the scoped database RPC rejects the edit', async () => {
  rpc.mockResolvedValueOnce({
    data: null,
    error: { message: 'Reviewer does not have membership review access for the destination member area.' },
  })

  const handler = updateMemberApplicationAction as unknown as (args: {
    data: { memberId: string; accessToken: string; payload: typeof payload }
  }) => Promise<unknown>

  await expect(
    handler({ data: { memberId, accessToken: 'valid-access-token', payload } }),
  ).rejects.toThrow('destination member area')

  expect(memberUpdate).not.toHaveBeenCalled()
})

for (const [name, action, status] of [
  ['approve', approveMemberAction, 'approved'],
  ['reject', rejectMemberAction, 'rejected'],
] as const) {
  const invoke = () => (action as unknown as (arg: { data: Record<string, unknown> }) => Promise<unknown>)({
    data: { memberId, accessToken: 'valid-access-token', rejectionReason: 'Test rejection' },
  })
  it(`${name}: accepts only the confirmed target and status`, async () => {
    rpc.mockResolvedValueOnce({ data: { id: memberId, status }, error: null })
    await expect(invoke()).resolves.toMatchObject({ ok: true })
  })
  for (const data of [null, {}, [], { id: 'wrong', status }, { id: memberId, status: 'pending' }]) {
    it(`${name}: rejects empty or inconsistent RPC results ${JSON.stringify(data)}`, async () => {
      rpc.mockResolvedValueOnce({ data, error: null })
      await expect(invoke()).rejects.toThrow('Review was not confirmed')
    })
  }
  it(`${name}: propagates database conflict without success`, async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Application is no longer pending' } })
    await expect(invoke()).rejects.toThrow('no longer pending')
  })
}
