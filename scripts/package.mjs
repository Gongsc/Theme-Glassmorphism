import { mkdirSync, cpSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const meta = JSON.parse(readFileSync('theme.json', 'utf8'))
if (!/^[a-zA-Z0-9_-]+$/.test(meta.short)) throw new Error('Invalid theme short name')
const output = `release/${meta.short}`
rmSync(output, { recursive: true, force: true })
mkdirSync(output, { recursive: true })
for (const file of ['theme.json', 'LICENSE', 'dist']) cpSync(file, `${output}/${file}`, { recursive: true })
if (existsSync('preview.png')) cpSync('preview.png', `${output}/preview.png`)
const archive = `release/monitor-theme-${meta.short}-${meta.version}.tar.gz`
execFileSync('tar', ['-czf', archive, '-C', 'release', meta.short])
writeFileSync(`${archive}.sha256`, `${createHash('sha256').update(readFileSync(archive)).digest('hex')}  ${archive.split('/').at(-1)}\n`)
console.log(`Theme package: ${archive}`)
