import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  return (await Promise.all(entries.map(e => e.isDirectory() ? walk(join(dir, e.name)) : join(dir, e.name)))).flat()
}
let files
for (const root of ['.output/public', 'dist/client']) {
  try { files = await walk(root); break } catch (e) { if (e.code !== 'ENOENT') throw e }
}
if (!files) throw new Error('Build output missing. Run npm run build first.')
const assets = await Promise.all(files.filter(f => /\.(js|css)$/.test(f)).map(async path => {
  const data = await readFile(path)
  return { path, bytes: data.length, gzipBytes: gzipSync(data).length }
}))
assets.sort((a, b) => b.bytes - a.bytes)
await mkdir('release-reports', { recursive: true })
await writeFile('release-reports/assets.json', JSON.stringify({ generatedAt: new Date().toISOString(), assets }, null, 2))
console.table(assets.slice(0, 12).map(a => ({ file: a.path, KiB: Math.round(a.bytes / 1024), gzipKiB: Math.round(a.gzipBytes / 1024) })))
console.log('Report: release-reports/assets.json. These are bundle sizes, not measured page speed.')
