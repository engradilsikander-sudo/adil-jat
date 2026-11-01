export type DataError = { message: string; code?: string }
type Page<T> = { data: T[] | null; error: { message: string; code?: string } | null; count: number | null }

// Exact counts let this also work when the server caps a requested range below 500.
// Every caller must supply a deterministic, unique ordering (normally created_at, id).
export async function fetchAllRows<T>(fetchPage: (from: number, to: number) => PromiseLike<Page<T>>) {
  const rows: T[] = []
  try {
    let expected: number | null = null
    for (;;) {
      const result = await fetchPage(rows.length, rows.length + 499)
      if (result.error) throw result.error
      if (result.count === null) throw new Error('The server did not return a complete record count. Please retry.')
      if (expected !== null && expected !== result.count) throw new Error('Records changed while loading. Please refresh for complete results.')
      expected = result.count
      const page = result.data ?? []
      rows.push(...page)
      if (rows.length === expected) return { data: rows, error: null }
      if (!page.length || rows.length > expected) throw new Error('Incomplete record response. Please refresh.')
    }
  } catch (error) {
    const record = error as Partial<DataError> | null
    return { data: [] as T[], error: { message: record?.message || 'Records could not be loaded.', code: record?.code } }
  }
}

export function adminErrorMessage(error: unknown, fallback = 'Records could not be loaded. Please retry.') {
  const value = error as { code?: unknown; message?: unknown } | null
  if (value?.code === '42501') return 'Access to these records is unavailable. Ask an administrator to check database permissions.'
  if (value?.code === 'PGRST202' || value?.code === '42P01') return 'This feature needs the latest database migration. Ask an administrator to complete setup.'
  const message = typeof value?.message === 'string' ? value.message : ''
  // Do not display database object names, SQL hints, or raw PostgreSQL syntax.
  if (/permission denied|GRANT\s|relation .*does not exist|violates .*constraint/i.test(message)) return fallback
  return message || fallback
}
