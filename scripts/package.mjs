import { mkdirSync, cpSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const meta = JSON.parse(readFileSync('theme.json', 'utf8'))
if (!/^[a-zA-Z0-9_-]+$/.test(meta.short)) throw new Error('Invalid theme short name')
for (const key of ['name', 'description', 'version', 'author', 'url']) {
  if (typeof meta[key] !== 'string' || !meta[key].trim()) throw new Error(`Missing theme metadata: ${key}`)
}
if (!existsSync('dist/index.html')) throw new Error('Missing dist/index.html; run the build first')
if (!existsSync('preview.png')) throw new Error('Missing preview.png')
const output = `release/${meta.short}`
rmSync(output, { recursive: true, force: true })
mkdirSync(output, { recursive: true })
for (const file of ['theme.json', 'LICENSE', 'dist']) cpSync(file, `${output}/${file}`, { recursive: true })
cpSync('preview.png', `${output}/preview.png`)
const archive = 'release/theme.tar.gz'
execFileSync('tar', ['--format=ustar', '-czf', archive, '-C', output, 'theme.json', 'LICENSE', 'dist', 'preview.png'], { env: { ...process.env, COPYFILE_DISABLE: '1' } })
// Keep the versioned download compatible with manual upload too.
cpSync(archive, `release/monitor-theme-${meta.short}-${meta.version}.tar.gz`)
writeFileSync(`${archive}.sha256`, `${createHash('sha256').update(readFileSync(archive)).digest('hex')}  ${archive.split('/').at(-1)}\n`)
console.log(`Theme package: ${archive}`)
