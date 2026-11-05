/**
 * UX.12 local mobile release preflight.
 * Checks packaged assets and metadata; cannot certify real devices, HTTPS DNS,
 * Android app signing or a production authorization policy.
 */
import { readFile, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const FINGERPRINT = /^(?:[0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2}$/

function requireCondition(condition, message) {
  if (!condition) throw new Error(message)
}

export function pngDimensions(buffer) {
  requireCondition(Buffer.isBuffer(buffer) && buffer.length >= 24, 'Incomplete PNG asset')
  requireCondition(buffer.subarray(0, 8).equals(PNG_SIGNATURE), 'Asset is not a valid PNG signature')
  requireCondition(buffer.toString('ascii', 12, 16) === 'IHDR', 'PNG has no IHDR header')
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  requireCondition(width > 0 && height > 0 && width <= 16384 && height <= 16384, 'Invalid PNG dimensions')
  return { width, height }
}

export function inspectManifest(value) {
  requireCondition(value && typeof value === 'object' && !Array.isArray(value), 'Missing PWA manifest object')
  for (const key of ['name', 'short_name', 'start_url', 'scope', 'theme_color', 'background_color']) {
    requireCondition(typeof value[key] === 'string' && value[key].trim(), `PWA manifest missing ${key}`)
  }
  requireCondition(value.display === 'standalone', 'PWA manifest must request standalone mode')
  for (const key of ['start_url', 'scope']) {
    const path = value[key]
    requireCondition(path.startsWith('/') && !path.startsWith('//') && !path.includes('\\'), `PWA ${key} must stay same-origin`)
  }
  requireCondition(Array.isArray(value.icons) && value.icons.length >= 2, 'PWA manifest requires 192 and 512 icons')
  const icons = new Map()
  for (const icon of value.icons) {
    requireCondition(icon && typeof icon === 'object', 'Invalid manifest icon entry')
    requireCondition(icon.type === 'image/png', `Unexpected manifest icon MIME type: ${String(icon.type)}`)
    requireCondition(typeof icon.src === 'string' && /^\/[a-zA-Z0-9/_-]+\.png$/.test(icon.src), `Unsafe icon path ${String(icon.src)}`)
    requireCondition(typeof icon.sizes === 'string', 'Manifest icon dimensions are missing')
    icons.set(icon.sizes, icon.src)
  }
  for (const required of ['192x192', '512x512']) requireCondition(icons.has(required), `PWA icon ${required} missing`)
  return icons
}

export function inspectAssetLinks(value, expectedPackage = '') {
  requireCondition(Array.isArray(value), 'Android assetlinks.json must be an array')
  const entries = value.filter((entry) =>
    entry && Array.isArray(entry.relation) &&
    entry.relation.includes('delegate_permission/common.handle_all_urls') &&
    entry.target?.namespace === 'android_app',
  )
  requireCondition(entries.length > 0, 'Android assetlinks.json lacks a TWA delegation')
  for (const entry of entries) {
    const target = entry.target
    requireCondition(typeof target.package_name === 'string' && /^[a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+$/.test(target.package_name), 'Android package name is invalid')
    requireCondition(Array.isArray(target.sha256_cert_fingerprints) && target.sha256_cert_fingerprints.length > 0,
      'Android signing fingerprints are missing')
    for (const fingerprint of target.sha256_cert_fingerprints) {
      requireCondition(typeof fingerprint === 'string' && FINGERPRINT.test(fingerprint), 'Android signing fingerprint is invalid')
    }
  }
  if (expectedPackage) {
    requireCondition(entries.some((entry) => entry.target.package_name === expectedPackage),
      `Asset Links does not include requested Android package ${expectedPackage}`)
  }
  return entries.map((entry) => entry.target.package_name)
}

export async function inspectProject(projectRoot, { expectedPackage = '' } = {}) {
  const root = resolve(projectRoot)
  const publicRoot = join(root, 'public')
  const manifest = JSON.parse(await readFile(join(publicRoot, 'manifest.json'), 'utf8'))
  const assetlinks = JSON.parse(await readFile(join(publicRoot, '.well-known', 'assetlinks.json'), 'utf8'))
  const icons = inspectManifest(manifest)
  const packages = inspectAssetLinks(assetlinks, expectedPackage)
  const checks = []
  for (const [dimensions, src] of icons.entries()) {
    const file = resolve(publicRoot, `.${src}`)
    requireCondition(file.startsWith(`${publicRoot}/`), `Manifest asset escapes public directory: ${src}`)
    const iconStat = await stat(file)
    requireCondition(iconStat.isFile(), `Manifest asset is not a file: ${src}`)
    const actual = pngDimensions(await readFile(file))
    const [expectedWidth, expectedHeight] = dimensions.split('x').map(Number)
    requireCondition(actual.width === expectedWidth && actual.height === expectedHeight,
      `Icon ${src} dimensions ${actual.width}x${actual.height} do not match manifest ${dimensions}`)
    checks.push(`Icon ${dimensions} verified`)
  }
  const appleIcon = pngDimensions(await readFile(join(publicRoot, 'apple-touch-icon.png')))
  requireCondition(appleIcon.width >= 180 && appleIcon.height >= 180, 'Apple touch icon is too small')
  checks.push('Apple touch icon dimensions verified')
  const offline = await readFile(join(publicRoot, 'offline.html'), 'utf8')
  requireCondition(/<main\b/i.test(offline) && /<h1\b/i.test(offline), 'Offline fallback lacks page structure')
  const worker = await readFile(join(publicRoot, 'sw.js'), 'utf8')
  requireCondition(worker.includes("'/offline.html'") && worker.includes("'/manifest.json'"),
    'Service worker does not reference offline/PWA core assets')
  checks.push('Offline fallback and service worker core assets verified')
  const rootRoute = await readFile(join(root, 'src', 'routes', '__root.tsx'), 'utf8')
  requireCondition(rootRoute.includes("'/manifest.json'") && rootRoute.includes('viewport-fit=cover'),
    'Root metadata missing manifest or safe-area viewport support')
  checks.push('App root manifest and safe-area metadata verified')
  checks.push('Android Asset Links structure and fingerprint format verified')
  return { checks, packages, iconCount: icons.size }
}

async function main() {
  const projectRoot = process.argv[2] ?? process.cwd()
  const expectedPackage = process.env.EXPECTED_ANDROID_PACKAGE ?? ''
  try {
    const result = await inspectProject(projectRoot, { expectedPackage })
    for (const item of result.checks) console.log(`PASS: ${item}`)
    console.log(`INFO: Asset Links package(s): ${result.packages.join(', ')}`)
    console.log('NOT VERIFIED: actual signed APK/AAB, website HTTPS, domain association, Android/iOS device behavior, Cloud RLS or manual release sign-off.')
  } catch (error) {
    console.error('FAIL: Mobile release preflight:', error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
