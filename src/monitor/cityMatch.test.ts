import assert from 'node:assert/strict'
import manifest from '../../theme.json' with { type: 'json' }
import { builtinCities, findBuiltinCity, matchNodeCity, parseCityRules } from './cityMatch.ts'

const defaultText = String(manifest.config.find(field => 'key' in field && field.key === 'earthCityRules')?.default)
const defaults = parseCityRules(defaultText)
const id = (name: string, country = '', rules = defaults.rules) => matchNodeCity(name, country, rules)?.id ?? null

// 默认规则（设置里可见的那份）本身必须全部可解析，且覆盖每个内置城市。
assert.deepEqual(defaults.errors, [])
assert.deepEqual(new Set(defaults.rules.map(rule => rule.city?.id)), new Set(builtinCities.map(city => city.id)))
console.log('City rules: default rules parse cleanly and cover every built-in city passed')

// 英文名、中文名、机场代码、连写与数字相邻都能识别。
assert.equal(id('Tokyo · 东京主节点', 'JP'), 'tokyo')
assert.equal(id('东京 IIJ', 'JP'), 'tokyo')
assert.equal(id('lax01', 'US'), 'los-angeles')
assert.equal(id('HKG-BGP-2', 'HK'), 'hong-kong')
assert.equal(id('hongkong-hkt'), 'hong-kong')
assert.equal(id('Los Angeles CN2 GIA', 'US'), 'los-angeles')
assert.equal(id('São Paulo', 'BR'), 'sao-paulo')
assert.equal(id('DMIT.LAX.Pro'), 'los-angeles')
console.log('City match: names, Chinese, IATA codes, joined forms, digits and diacritics passed')

// 整词匹配，避免误判；国家不一致时跳过；未识别返回 null；按规则顺序取第一条。
assert.equal(id('relax-box'), null)
assert.equal(id('Singapore-Pro', 'US'), null)
assert.equal(id('备用节点 · 等待连接', 'CN'), null)
assert.equal(id('Los Angeles'), 'los-angeles') // 北美排在拉各斯（LOS）之前
assert.equal(id('Tokyo → LAX'), 'tokyo')
assert.equal(id('沪日专线 NRT', 'JP'), 'tokyo') // 沪=上海，但国家为 JP 时跳过
assert.equal(id('Tokyo', '', []), null) // 规则清空后不识别任何城市
console.log('City match: whole-word, country guard, rule order, empty rules and misses passed')

const custom = parseCityRules([
  '# 注释行',
  'edge-a, 边缘A = 香港',
  'Frankfurt = -',
  'bj-idc = Beijing',
  'lab = 我的机房@31.2,121.5',
  '坏规则',
  'x = 不存在的城市',
  'y = 远方@91,0',
].join('\n'))
assert.deepEqual(custom.errors, [6, 7, 8])
const rules = [...custom.rules, ...defaults.rules]
assert.equal(id('EDGE-A-01', 'HK', rules), 'hong-kong') // 写在前面的自定义规则优先
assert.equal(id('节点 边缘A', '', rules), 'hong-kong')
assert.equal(id('EDGE-A-01', 'US', rules), null) // 目标是内置城市时同样校验国家
assert.equal(id('Frankfurt · 法兰克福', 'DE', rules), null) // `-` 命中即不识别，后续规则不再匹配
assert.equal(id('bj-idc-1', 'CN', rules), 'beijing')
const lab = matchNodeCity('lab-7', 'CN', rules)!
assert.deepEqual([lab.name, lab.lat, lab.lng, lab.country], ['我的机房', 31.2, 121.5, ''])
console.log('City rules: comments, priority, disable, custom coordinates and error lines passed')

assert.equal(findBuiltinCity('东京')?.id, 'tokyo')
assert.equal(findBuiltinCity('tokyo')?.id, 'tokyo')
assert.equal(findBuiltinCity('Kuala Lumpur')?.id, 'kuala-lumpur')
assert.equal(findBuiltinCity('东'), null)
assert.equal(new Set(builtinCities.map(city => city.id)).size, builtinCities.length)
for (const city of builtinCities)
  assert.ok(Math.abs(city.lat) <= 90 && Math.abs(city.lng) <= 180 && /^[A-Z]{2}$/.test(city.country), city.id)
console.log('City table: lookup by name, unique ids, valid coordinates and country codes passed')
