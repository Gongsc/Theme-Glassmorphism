// 从节点名称识别城市，供地球按城市定位。Monitor 不提供城市或 IP，这里只依据管理员起的节点名。
// 纯函数，Node 测试可直接加载。
export type City = { id: string, name: string, country: string, lat: number, lng: number }
export type CityRule = { keywords: string[], city: City | null }

// [id, 中文名, 国家, 纬度, 经度, 别名...]；别名含英文名、连写、机场/城市代码与常见缩写。
const CITY_TABLE: Array<[string, string, string, number, number, ...string[]]> = [
  ['hong-kong', '香港', 'HK', 22.32, 114.17, 'Hong Kong', 'HongKong', 'HKG', 'HK'],
  ['taipei', '台北', 'TW', 25.03, 121.57, 'Taipei', 'TPE', '臺北'],
  ['tokyo', '东京', 'JP', 35.68, 139.69, 'Tokyo', 'TYO', 'NRT', 'HND', '東京'],
  ['osaka', '大阪', 'JP', 34.69, 135.5, 'Osaka', 'OSA', 'KIX'],
  ['seoul', '首尔', 'KR', 37.57, 126.98, 'Seoul', 'SEL', 'ICN', '首爾'],
  ['chuncheon', '春川', 'KR', 37.88, 127.73, 'Chuncheon'],
  ['singapore', '新加坡', 'SG', 1.35, 103.82, 'Singapore', 'SIN', 'SG', '狮城'],
  ['kuala-lumpur', '吉隆坡', 'MY', 3.14, 101.69, 'Kuala Lumpur', 'KualaLumpur', 'KUL'],
  ['bangkok', '曼谷', 'TH', 13.76, 100.5, 'Bangkok', 'BKK'],
  ['ho-chi-minh', '胡志明市', 'VN', 10.82, 106.63, 'Ho Chi Minh', 'Ho Chi Minh City', 'Saigon', 'SGN', '胡志明'],
  ['hanoi', '河内', 'VN', 21.03, 105.85, 'Hanoi', 'HAN'],
  ['manila', '马尼拉', 'PH', 14.6, 120.98, 'Manila', 'MNL'],
  ['jakarta', '雅加达', 'ID', -6.21, 106.85, 'Jakarta', 'JKT', 'CGK'],
  ['mumbai', '孟买', 'IN', 19.08, 72.88, 'Mumbai', 'BOM'],
  ['delhi', '德里', 'IN', 28.61, 77.21, 'Delhi', 'New Delhi', 'DEL', '新德里'],
  ['bengaluru', '班加罗尔', 'IN', 12.97, 77.59, 'Bengaluru', 'Bangalore', 'BLR'],
  ['dubai', '迪拜', 'AE', 25.2, 55.27, 'Dubai', 'DXB'],
  ['istanbul', '伊斯坦布尔', 'TR', 41.01, 28.98, 'Istanbul', 'IST'],
  ['tel-aviv', '特拉维夫', 'IL', 32.09, 34.78, 'Tel Aviv', 'TLV'],
  ['beijing', '北京', 'CN', 39.9, 116.41, 'Beijing', 'PEK', 'BJS'],
  ['shanghai', '上海', 'CN', 31.23, 121.47, 'Shanghai', 'SHA', 'PVG', '沪'],
  ['guangzhou', '广州', 'CN', 23.13, 113.26, 'Guangzhou', 'CAN'],
  ['shenzhen', '深圳', 'CN', 22.54, 114.06, 'Shenzhen', 'SZX'],
  ['hangzhou', '杭州', 'CN', 30.27, 120.16, 'Hangzhou', 'HGH'],
  ['ningbo', '宁波', 'CN', 29.87, 121.54, 'Ningbo', 'NGB'],
  ['nanjing', '南京', 'CN', 32.06, 118.8, 'Nanjing', 'NKG'],
  ['suqian', '宿迁', 'CN', 33.96, 118.28, 'Suqian'],
  ['chengdu', '成都', 'CN', 30.57, 104.07, 'Chengdu', 'CTU'],
  ['chongqing', '重庆', 'CN', 29.56, 106.55, 'Chongqing', 'CKG'],
  ['wuhan', '武汉', 'CN', 30.59, 114.31, 'Wuhan', 'WUH'],
  ['xian', '西安', 'CN', 34.34, 108.94, "Xi'an", 'Xian', 'XIY'],
  ['qingdao', '青岛', 'CN', 36.07, 120.38, 'Qingdao', 'TAO'],
  ['tianjin', '天津', 'CN', 39.34, 117.36, 'Tianjin', 'TSN'],
  ['xiamen', '厦门', 'CN', 24.48, 118.09, 'Xiamen', 'XMN'],
  ['fuzhou', '福州', 'CN', 26.07, 119.3, 'Fuzhou', 'FOC'],
  ['zhengzhou', '郑州', 'CN', 34.75, 113.63, 'Zhengzhou', 'CGO'],
  ['changsha', '长沙', 'CN', 28.23, 112.94, 'Changsha', 'CSX'],
  ['shenyang', '沈阳', 'CN', 41.81, 123.43, 'Shenyang', 'SHE'],
  ['macau', '澳门', 'MO', 22.2, 113.54, 'Macau', 'Macao', 'MFM', '澳門'],
  ['los-angeles', '洛杉矶', 'US', 34.05, -118.24, 'Los Angeles', 'LosAngeles', 'LAX', 'LA', '洛杉磯'],
  ['san-jose', '圣何塞', 'US', 37.34, -121.89, 'San Jose', 'SanJose', 'SJC', '硅谷', 'Silicon Valley'],
  ['fremont', '弗里蒙特', 'US', 37.55, -121.99, 'Fremont'],
  ['san-francisco', '旧金山', 'US', 37.77, -122.42, 'San Francisco', 'SanFrancisco', 'SFO', 'SF', '三藩市'],
  ['seattle', '西雅图', 'US', 47.61, -122.33, 'Seattle', 'SEA'],
  ['portland', '波特兰', 'US', 45.52, -122.68, 'Portland', 'PDX'],
  ['las-vegas', '拉斯维加斯', 'US', 36.17, -115.14, 'Las Vegas', 'LasVegas', 'LAS', '赌城'],
  ['phoenix', '凤凰城', 'US', 33.45, -112.07, 'Phoenix', 'PHX'],
  ['salt-lake-city', '盐湖城', 'US', 40.76, -111.89, 'Salt Lake City', 'SLC'],
  ['denver', '丹佛', 'US', 39.74, -104.99, 'Denver', 'DEN'],
  ['dallas', '达拉斯', 'US', 32.78, -96.8, 'Dallas', 'DFW', 'DAL'],
  ['kansas-city', '堪萨斯城', 'US', 39.1, -94.58, 'Kansas City', 'MCI'],
  ['chicago', '芝加哥', 'US', 41.88, -87.63, 'Chicago', 'ORD', 'CHI'],
  ['atlanta', '亚特兰大', 'US', 33.75, -84.39, 'Atlanta', 'ATL'],
  ['miami', '迈阿密', 'US', 25.76, -80.19, 'Miami', 'MIA'],
  ['ashburn', '阿什本', 'US', 39.04, -77.49, 'Ashburn', 'IAD', 'Virginia', '弗吉尼亚'],
  ['washington', '华盛顿', 'US', 38.91, -77.04, 'Washington', 'WAS', 'DCA'],
  ['new-york', '纽约', 'US', 40.71, -74.01, 'New York', 'NewYork', 'NYC', 'JFK', 'NY'],
  ['new-jersey', '新泽西', 'US', 40.73, -74.17, 'New Jersey', 'Newark', 'EWR', 'NJ'],
  ['buffalo', '布法罗', 'US', 42.89, -78.88, 'Buffalo', 'BUF'],
  ['toronto', '多伦多', 'CA', 43.65, -79.38, 'Toronto', 'YYZ'],
  ['montreal', '蒙特利尔', 'CA', 45.5, -73.57, 'Montreal', 'YUL'],
  ['vancouver', '温哥华', 'CA', 49.28, -123.12, 'Vancouver', 'YVR'],
  ['mexico-city', '墨西哥城', 'MX', 19.43, -99.13, 'Mexico City', 'MEX'],
  ['sao-paulo', '圣保罗', 'BR', -23.55, -46.63, 'Sao Paulo', 'São Paulo', 'SaoPaulo', 'GRU'],
  ['santiago', '圣地亚哥', 'CL', -33.45, -70.67, 'Santiago', 'SCL'],
  ['buenos-aires', '布宜诺斯艾利斯', 'AR', -34.6, -58.38, 'Buenos Aires', 'EZE'],
  ['london', '伦敦', 'GB', 51.51, -0.13, 'London', 'LON', 'LHR'],
  ['manchester', '曼彻斯特', 'GB', 53.48, -2.24, 'Manchester', 'MAN'],
  ['dublin', '都柏林', 'IE', 53.35, -6.26, 'Dublin', 'DUB'],
  ['paris', '巴黎', 'FR', 48.86, 2.35, 'Paris', 'PAR', 'CDG'],
  ['amsterdam', '阿姆斯特丹', 'NL', 52.37, 4.9, 'Amsterdam', 'AMS'],
  ['brussels', '布鲁塞尔', 'BE', 50.85, 4.35, 'Brussels', 'BRU'],
  ['frankfurt', '法兰克福', 'DE', 50.11, 8.68, 'Frankfurt', 'FRA'],
  ['dusseldorf', '杜塞尔多夫', 'DE', 51.23, 6.77, 'Dusseldorf', 'Düsseldorf', 'DUS'],
  ['nuremberg', '纽伦堡', 'DE', 49.45, 11.08, 'Nuremberg', 'Nürnberg', 'Nurnberg', 'NUE'],
  ['falkenstein', '法尔肯施泰因', 'DE', 50.48, 12.37, 'Falkenstein', 'FSN'],
  ['berlin', '柏林', 'DE', 52.52, 13.4, 'Berlin', 'BER'],
  ['munich', '慕尼黑', 'DE', 48.14, 11.58, 'Munich', 'München', 'MUC'],
  ['hamburg', '汉堡', 'DE', 53.55, 9.99, 'Hamburg', 'HAM'],
  ['zurich', '苏黎世', 'CH', 47.38, 8.54, 'Zurich', 'Zürich', 'ZRH'],
  ['vienna', '维也纳', 'AT', 48.21, 16.37, 'Vienna', 'VIE'],
  ['milan', '米兰', 'IT', 45.46, 9.19, 'Milan', 'MIL', 'MXP'],
  ['madrid', '马德里', 'ES', 40.42, -3.7, 'Madrid', 'MAD'],
  ['lisbon', '里斯本', 'PT', 38.72, -9.14, 'Lisbon', 'LIS'],
  ['warsaw', '华沙', 'PL', 52.23, 21.01, 'Warsaw', 'WAW'],
  ['prague', '布拉格', 'CZ', 50.08, 14.44, 'Prague', 'PRG'],
  ['bucharest', '布加勒斯特', 'RO', 44.43, 26.1, 'Bucharest', 'OTP'],
  ['sofia', '索非亚', 'BG', 42.7, 23.32, 'Sofia', 'SOF'],
  ['helsinki', '赫尔辛基', 'FI', 60.17, 24.94, 'Helsinki', 'HEL'],
  ['stockholm', '斯德哥尔摩', 'SE', 59.33, 18.07, 'Stockholm', 'STO', 'ARN'],
  ['oslo', '奥斯陆', 'NO', 59.91, 10.75, 'Oslo', 'OSL'],
  ['copenhagen', '哥本哈根', 'DK', 55.68, 12.57, 'Copenhagen', 'CPH'],
  ['moscow', '莫斯科', 'RU', 55.76, 37.62, 'Moscow', 'MOW', 'SVO'],
  ['saint-petersburg', '圣彼得堡', 'RU', 59.93, 30.34, 'Saint Petersburg', 'St Petersburg', 'LED'],
  ['kyiv', '基辅', 'UA', 50.45, 30.52, 'Kyiv', 'Kiev', 'IEV'],
  ['johannesburg', '约翰内斯堡', 'ZA', -26.2, 28.05, 'Johannesburg', 'JNB'],
  ['cairo', '开罗', 'EG', 30.04, 31.24, 'Cairo', 'CAI'],
  ['lagos', '拉各斯', 'NG', 6.52, 3.38, 'Lagos', 'LOS'],
  ['sydney', '悉尼', 'AU', -33.87, 151.21, 'Sydney', 'SYD'],
  ['melbourne', '墨尔本', 'AU', -37.81, 144.96, 'Melbourne', 'MEL'],
  ['auckland', '奥克兰', 'NZ', -36.85, 174.76, 'Auckland', 'AKL'],
]

const LATIN_RE = /^[\p{Script=Latin}\d' ]+$/u
const TOKEN_SPLIT_RE = /[^\p{L}\p{N}']+|(?<=\p{L})(?=\p{N})|(?<=\p{N})(?=\p{L})/u

function fold(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
}

// 英文与代码按整词匹配（lax01、HKG-BGP 可以，relax 不行）；中文按包含匹配。
function tokens(text: string): string {
  return ` ${fold(text).split(TOKEN_SPLIT_RE).filter(Boolean).join(' ')} `
}

type Pattern = { key: string, latin: boolean }
type Alias = Pattern & { city: City }
function pattern(word: string): Pattern {
  const latin = LATIN_RE.test(word)
  return { key: latin ? tokens(word) : fold(word), latin }
}

export const builtinCities: City[] = CITY_TABLE.map(([id, name, country, lat, lng]) => ({ id, name, country, lat, lng }))
const builtinAliases: Alias[] = CITY_TABLE.flatMap(([, name, , , , ...names], index) => {
  const city = builtinCities[index]!
  return [name, ...names].map(word => ({ city, ...pattern(word) }))
})

function findAt(name: string, entry: Pattern, tokenized: string): number {
  return entry.latin ? tokenized.indexOf(entry.key) : fold(name).indexOf(entry.key)
}

/** 城市名、英文名或代码 → 内置城市。 */
export function findBuiltinCity(text: string): City | null {
  const wanted = pattern(text.trim())
  return builtinAliases.find(entry => entry.latin === wanted.latin && entry.key === wanted.key)?.city ?? null
}

const COORD_RE = /^(.+?)@\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)$/

/**
 * 解析自定义规则，每行 `关键词1,关键词2 = 城市`。
 * 城市可写内置城市的任一名称或代码，或 `显示名@纬度,经度`；写 `-` 表示这些关键词不识别城市。
 * 无法解析的行会被忽略，并在 errors 里给出行号。
 */
export function parseCityRules(text: string): { rules: CityRule[], errors: number[] } {
  const rules: CityRule[] = []
  const errors: number[] = []
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim()
    if (!line || line.startsWith('#')) return
    const eq = line.search(/[=＝]/)
    const keywords = eq > 0 ? line.slice(0, eq).split(/[,，]/).map(k => k.trim()).filter(Boolean) : []
    const target = eq > 0 ? line.slice(eq + 1).trim() : ''
    let city: City | null | undefined
    if (target === '-') city = null
    else {
      const custom = target.match(COORD_RE)
      const lat = Number(custom?.[2])
      const lng = Number(custom?.[3])
      city = custom && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
        ? { id: `custom-${fold(custom[1]!.trim())}`, name: custom[1]!.trim(), country: '', lat, lng }
        : findBuiltinCity(target) ?? undefined
    }
    if (!keywords.length || city === undefined) errors.push(index + 1)
    else rules.push({ keywords, city })
  })
  return { rules, errors }
}

/**
 * 按节点名识别城市：先按顺序匹配自定义规则，再匹配内置城市（取名称中最靠前的一个）。
 * 内置城市与节点国家不一致时跳过，避免把美国节点名里的 SEA 当成别处。
 */
export function matchNodeCity(name: string, country: string, rules: CityRule[] = []): City | null {
  const tokenized = tokens(name)
  for (const rule of rules) {
    if (rule.keywords.some(keyword => findAt(name, pattern(keyword), tokenized) >= 0))
      return rule.city
  }
  const code = country.trim().toUpperCase()
  let best: { city: City, at: number, length: number } | null = null
  for (const entry of builtinAliases) {
    if (code && entry.city.country !== code) continue
    const at = findAt(name, entry, tokenized)
    if (at < 0) continue
    if (!best || at < best.at || (at === best.at && entry.key.length > best.length))
      best = { city: entry.city, at, length: entry.key.length }
  }
  return best?.city ?? null
}
