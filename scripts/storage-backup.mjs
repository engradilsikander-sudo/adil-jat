import { createClient } from '@supabase/supabase-js'
import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
const [command, directory] = process.argv.slice(2)
if (!['backup', 'verify', 'restore'].includes(command) || !directory) throw new Error('Usage: node scripts/storage-backup.mjs backup|verify|restore /absolute/backup-directory')
const dir = resolve(directory)
const hash = data => createHash('sha256').update(data).digest('hex')
function unwrap(result) { if (result.error) throw new Error(result.error.message); return result.data }
async function verify() {
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'))
  if (manifest.version !== 1 || !Array.isArray(manifest.buckets) || !Array.isArray(manifest.objects)) throw new Error('Invalid manifest')
  const seen = new Set()
  const buckets = new Set(manifest.buckets.map(b => b.id))
  if (buckets.size !== manifest.buckets.length) throw new Error('Duplicate bucket')
  for (const object of manifest.objects) {
    if (!/^blobs\/[0-9]+\.bin$/.test(object.file) || !buckets.has(object.bucket) || typeof object.path !== 'string' || !object.path) throw new Error('Invalid object entry')
    const key = JSON.stringify([object.bucket, object.path])
    if (seen.has(key)) throw new Error('Duplicate object')
    seen.add(key)
    const filename = join(dir, object.file)
    if (!(await lstat(filename)).isFile() || (await lstat(join(dir, 'blobs'))).isSymbolicLink()) throw new Error('Unsafe backup file')
    const bytes = await readFile(filename)
    if (bytes.length !== object.bytes || hash(bytes) !== object.sha256) throw new Error('Backup integrity failed: ' + object.file)
  }
  console.log(`Verified ${manifest.objects.length} objects in ${manifest.buckets.length} buckets.`)
  return manifest
}
if (command === 'verify') { await verify(); process.exit(0) }
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the shell, never in source control.')
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
if (command === 'backup') {
  // Refuse an existing destination, including incomplete backups.
  await mkdir(dir, { mode: 0o700 })
  await mkdir(join(dir, 'blobs'), { mode: 0o700 })
  const buckets = unwrap(await client.storage.listBuckets())
  const manifest = { version: 1, createdAt: new Date().toISOString(), sourceOrigin: new URL(url).origin, buckets, objects: [] }
  async function visit(bucket, prefix = '') {
    for (let offset = 0; ; offset += 100) {
      const items = unwrap(await client.storage.from(bucket).list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }))
      for (const item of items) {
        const path = prefix ? `${prefix}/${item.name}` : item.name
        if (!item.id) { await visit(bucket, path); continue }
        const blob = unwrap(await client.storage.from(bucket).download(path))
        const bytes = Buffer.from(await blob.arrayBuffer())
        const file = `blobs/${manifest.objects.length}.bin`
        await writeFile(join(dir, file), bytes, { mode: 0o600, flag: 'wx' })
        manifest.objects.push({ bucket, path, file, bytes: bytes.length, sha256: hash(bytes), contentType: blob.type || 'application/octet-stream' })
      }
      if (items.length < 100) break
    }
  }
  for (const bucket of buckets) await visit(bucket.id)
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600, flag: 'wx' })
  await verify()
} else {
  const manifest = await verify()
  const target = new URL(url).origin
  if (target === manifest.sourceOrigin || process.env.JAS_RESTORE_TARGET !== target) throw new Error('Restore requires a different target project and JAS_RESTORE_TARGET equal to its URL origin.')
  const existing = unwrap(await client.storage.listBuckets())
  // Check every destination before creating or uploading anything. Never overwrite objects.
  for (const bucket of manifest.buckets) {
    if (existing.some(b => b.id === bucket.id)) {
      const items = unwrap(await client.storage.from(bucket.id).list('', { limit: 1 }))
      if (items.length) throw new Error('Destination bucket is not empty: ' + bucket.id)
    }
  }
  for (const bucket of manifest.buckets) {
    if (!existing.some(b => b.id === bucket.id)) unwrap(await client.storage.createBucket(bucket.id, { public: bucket.public, fileSizeLimit: bucket.file_size_limit, allowedMimeTypes: bucket.allowed_mime_types }))
  }
  for (const object of manifest.objects) unwrap(await client.storage.from(object.bucket).upload(object.path, await readFile(join(dir, object.file)), { contentType: object.contentType, upsert: false }))
  console.log('Storage restore complete. Verify application access and policies separately.')
}
