import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inspectManifest, inspectAssetLinks, pngDimensions, inspectProject } from './check-mobile-release.mjs'

const manifest = {
  name: 'JAS', short_name: 'JAS', start_url: '/', scope: '/', display: 'standalone',
  theme_color: '#142d4e', background_color: '#ffffff',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ],
}
const assetLinks = [{
  relation: ['delegate_permission/common.handle_all_urls'],
  target: { namespace: 'android_app', package_name: 'org.jasofficial.twa',
    sha256_cert_fingerprints: [Array.from({ length: 32 }, () => 'AB').join(':')] },
}]

test('accepts a standalone manifest with local 192/512 PNG icons', () => {
  const icons = inspectManifest(manifest)
  assert.equal(icons.get('192x192'), '/icon-192.png')
  assert.equal(icons.get('512x512'), '/icon-512.png')
})
test('rejects missing PWA icon and unsafe external manifest paths', () => {
  assert.throws(() => inspectManifest({ ...manifest, icons: [manifest.icons[0]] }), /512/)
  assert.throws(() => inspectManifest({ ...manifest, start_url: '//remote.example' }), /same-origin/)
  assert.throws(() => inspectManifest({ ...manifest, icons: [
    { ...manifest.icons[0], src: 'https://elsewhere/icon.png' }, manifest.icons[1],
  ] }), /Unsafe icon path/)
})
test('validates TWA package, certificate fingerprint format and expected package', () => {
  assert.deepEqual(inspectAssetLinks(assetLinks, 'org.jasofficial.twa'), ['org.jasofficial.twa'])
  assert.throws(() => inspectAssetLinks(assetLinks, 'app.other'), /does not include/)
  assert.throws(() => inspectAssetLinks([{ ...assetLinks[0], target: {
    ...assetLinks[0].target, sha256_cert_fingerprints: ['PLACEHOLDER'],
  } }]), /fingerprint is invalid/)
})
test('reads PNG header dimensions and rejects truncated data', () => {
  const image = Buffer.alloc(24)
  Buffer.from([137,80,78,71,13,10,26,10]).copy(image)
  image.write('IHDR', 12, 'ascii')
  image.writeUInt32BE(192, 16)
  image.writeUInt32BE(192, 20)
  assert.deepEqual(pngDimensions(image), { width: 192, height: 192 })
  assert.throws(() => pngDimensions(Buffer.from('not an image')), /Incomplete PNG/)
})
test('current checked-in assets pass offline and PWA release preflight', async () => {
  // Run against project root, not temporary patches; checks actual on-disk bytes.
  const report = await inspectProject(process.cwd())
  assert.ok(report.iconCount >= 2)
  assert.ok(report.checks.some((value) => value.includes('Offline')))
})
