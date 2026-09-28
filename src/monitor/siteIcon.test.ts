import assert from 'node:assert/strict'
import { isValidSiteIconSetting, resolveSiteIcon, SITE_ICON_MAX_LENGTH } from './siteIcon.ts'

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

assert.equal(resolveSiteIcon(''), '')
assert.equal(resolveSiteIcon('   '), '')
assert.equal(resolveSiteIcon(undefined), '')
assert.equal(resolveSiteIcon(42), '')
assert.equal(resolveSiteIcon('https://cdn.example.com/icon.png'), 'https://cdn.example.com/icon.png')
assert.equal(resolveSiteIcon('  http://example.com/a.svg  '), 'http://example.com/a.svg')
assert.equal(resolveSiteIcon('/favicon.svg'), '/favicon.svg')
assert.equal(resolveSiteIcon(png), png)
assert.equal(resolveSiteIcon('data:image/svg+xml;base64,PHN2Zy8+'), 'data:image/svg+xml;base64,PHN2Zy8+')

// 不接受的来源：脚本协议、协议相对地址、非图片或非 base64 的 data URL、相对路径、超长内容
assert.equal(resolveSiteIcon('javascript:alert(1)'), '')
assert.equal(resolveSiteIcon('//evil.example.com/x.png'), '')
assert.equal(resolveSiteIcon('data:text/html;base64,PGgxPg=='), '')
assert.equal(resolveSiteIcon('data:image/svg+xml,<svg onload=alert(1)>'), '')
assert.equal(resolveSiteIcon('icon.png'), '')
assert.equal(resolveSiteIcon('local:icon.png'), '')
assert.equal(resolveSiteIcon('/a b.png'), '')
assert.equal(resolveSiteIcon(`data:image/png;base64,${'A'.repeat(SITE_ICON_MAX_LENGTH)}`), '')

assert.ok(isValidSiteIconSetting(''))
assert.ok(isValidSiteIconSetting('https://example.com/i.png'))
assert.ok(!isValidSiteIconSetting('ftp://example.com/i.png'))
assert.ok(!isValidSiteIconSetting(null))
console.log('Site icon: URL, site path, data URL, rejected sources and size limit passed')
