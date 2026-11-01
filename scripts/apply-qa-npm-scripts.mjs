#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const packagePath = path.join(process.cwd(), 'package.json')

if (!fs.existsSync(packagePath)) {
  console.error('package.json not found. Run this from the project root.')
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
pkg.scripts = pkg.scripts || {}

const additions = {
  qa: 'bash scripts/verify-project.sh',
  'qa:archive': 'bash scripts/check-safe-archive.sh',
}

let changed = false
for (const [key, value] of Object.entries(additions)) {
  if (pkg.scripts[key] !== value) {
    pkg.scripts[key] = value
    changed = true
  }
}

if (!changed) {
  console.log('QA npm scripts already present.')
  process.exit(0)
}

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)
console.log('Added QA npm scripts to package.json:')
for (const [key, value] of Object.entries(additions)) {
  console.log(`  ${key}: ${value}`)
}
