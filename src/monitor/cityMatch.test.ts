import assert from 'node:assert/strict'
import { builtinCities, findBuiltinCity, matchNodeCity, parseCityRules } from './cityMatch.ts'

const id = (name: string, country = '', rules = parseCityRules('').rules) => matchNodeCity(name, country, rules)?.id ?? null

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

// 整词匹配，避免误判；国家不一致时跳过；未识别返回 null。
assert.equal(id('relax-box'), null)
assert.equal(id('Singapore-Pro', 'US'), null)
assert.equal(id('备用节点 · 等待连接', 'CN'), null)
assert.equal(id('Los Angeles'), 'los-angeles') // 不应因 LOS（拉各斯）而误判
assert.equal(id('Tokyo → LAX', ''), 'tokyo') // 取名称中最靠前的城市
assert.equal(id('沪日专线 NRT', 'JP'), 'tokyo') // 沪=上海，但国家为 JP 时跳过
console.log('City match: whole-word, country guard, earliest match and misses passed')

const { rules, errors } = parseCityRules([
  '# 注释行',
  'edge-a, 边缘A = 香港',
  'Frankfurt = -',
  'bj-idc = 北京',
  'lab = 我的机房@31.2,121.5',
  '坏规则',
  'x = 不存在的城市',
  'y = 远方@91,0',
].join('\n'))
assert.deepEqual(errors, [6, 7, 8])
assert.equal(rules.length, 4)
assert.equal(id('EDGE-A-01', 'US', rules), 'hong-kong') // 自定义规则优先，且不做国家校验
assert.equal(id('节点 边缘A', '', rules), 'hong-kong')
assert.equal(id('Frankfurt · 法兰克福', 'DE', rules), null) // `-` 关闭识别
assert.equal(id('bj-idc-1', 'CN', rules), 'beijing')
const custom = matchNodeCity('lab-7', 'CN', rules)!
assert.deepEqual([custom.name, custom.lat, custom.lng, custom.country], ['我的机房', 31.2, 121.5, ''])
console.log('City rules: comments, multiple keywords, disable, custom coordinates and error lines passed')

assert.equal(findBuiltinCity('NRT')?.id, 'tokyo')
assert.equal(findBuiltinCity('东京')?.id, 'tokyo')
assert.equal(findBuiltinCity('东'), null)
assert.equal(new Set(builtinCities.map(city => city.id)).size, builtinCities.length)
for (const city of builtinCities)
  assert.ok(Math.abs(city.lat) <= 90 && Math.abs(city.lng) <= 180 && /^[A-Z]{2}$/.test(city.country), city.id)
console.log('City table: lookup, unique ids, valid coordinates and country codes passed')
