// 从节点名称识别城市，供地球按城市定位。Monitor 不提供城市或 IP，这里只依据管理员起的节点名。
// 关键词规则全部写在 theme.json 的 earthCityRules 默认值里（设置面板中可见可改），这里只保留城市坐标。
// 纯函数，Node 测试可直接加载。
export type City = { id: string, name: string, country: string, lat: number, lng: number }
export type CityRule = { keywords: string[], city: City | null }

// [id, 中文名, 英文名, 国家, 纬度, 经度]；规则里的城市按中文名或英文名引用。
const CITY_TABLE: Array<[string, string, string, string, number, number]> = [
  ['hong-kong', '香港', 'Hong Kong', 'HK', 22.32, 114.17],
  ['taipei', '台北', 'Taipei', 'TW', 25.03, 121.57],
  ['tokyo', '东京', 'Tokyo', 'JP', 35.68, 139.69],
  ['osaka', '大阪', 'Osaka', 'JP', 34.69, 135.5],
  ['seoul', '首尔', 'Seoul', 'KR', 37.57, 126.98],
  ['chuncheon', '春川', 'Chuncheon', 'KR', 37.88, 127.73],
  ['singapore', '新加坡', 'Singapore', 'SG', 1.35, 103.82],
  ['kuala-lumpur', '吉隆坡', 'Kuala Lumpur', 'MY', 3.14, 101.69],
  ['bangkok', '曼谷', 'Bangkok', 'TH', 13.76, 100.5],
  ['ho-chi-minh', '胡志明市', 'Ho Chi Minh', 'VN', 10.82, 106.63],
  ['hanoi', '河内', 'Hanoi', 'VN', 21.03, 105.85],
  ['manila', '马尼拉', 'Manila', 'PH', 14.6, 120.98],
  ['jakarta', '雅加达', 'Jakarta', 'ID', -6.21, 106.85],
  ['mumbai', '孟买', 'Mumbai', 'IN', 19.08, 72.88],
  ['delhi', '德里', 'Delhi', 'IN', 28.61, 77.21],
  ['bengaluru', '班加罗尔', 'Bengaluru', 'IN', 12.97, 77.59],
  ['dubai', '迪拜', 'Dubai', 'AE', 25.2, 55.27],
  ['istanbul', '伊斯坦布尔', 'Istanbul', 'TR', 41.01, 28.98],
  ['tel-aviv', '特拉维夫', 'Tel Aviv', 'IL', 32.09, 34.78],
  ['beijing', '北京', 'Beijing', 'CN', 39.9, 116.41],
  ['shanghai', '上海', 'Shanghai', 'CN', 31.23, 121.47],
  ['guangzhou', '广州', 'Guangzhou', 'CN', 23.13, 113.26],
  ['shenzhen', '深圳', 'Shenzhen', 'CN', 22.54, 114.06],
  ['hangzhou', '杭州', 'Hangzhou', 'CN', 30.27, 120.16],
  ['ningbo', '宁波', 'Ningbo', 'CN', 29.87, 121.54],
  ['nanjing', '南京', 'Nanjing', 'CN', 32.06, 118.8],
  ['suqian', '宿迁', 'Suqian', 'CN', 33.96, 118.28],
  ['chengdu', '成都', 'Chengdu', 'CN', 30.57, 104.07],
  ['chongqing', '重庆', 'Chongqing', 'CN', 29.56, 106.55],
  ['wuhan', '武汉', 'Wuhan', 'CN', 30.59, 114.31],
  ['xian', '西安', 'Xi\'an', 'CN', 34.34, 108.94],
  ['qingdao', '青岛', 'Qingdao', 'CN', 36.07, 120.38],
  ['tianjin', '天津', 'Tianjin', 'CN', 39.34, 117.36],
  ['xiamen', '厦门', 'Xiamen', 'CN', 24.48, 118.09],
  ['fuzhou', '福州', 'Fuzhou', 'CN', 26.07, 119.3],
  ['zhengzhou', '郑州', 'Zhengzhou', 'CN', 34.75, 113.63],
  ['changsha', '长沙', 'Changsha', 'CN', 28.23, 112.94],
  ['shenyang', '沈阳', 'Shenyang', 'CN', 41.81, 123.43],
  ['macau', '澳门', 'Macau', 'MO', 22.2, 113.54],
  ['los-angeles', '洛杉矶', 'Los Angeles', 'US', 34.05, -118.24],
  ['san-jose', '圣何塞', 'San Jose', 'US', 37.34, -121.89],
  ['fremont', '弗里蒙特', 'Fremont', 'US', 37.55, -121.99],
  ['san-francisco', '旧金山', 'San Francisco', 'US', 37.77, -122.42],
  ['seattle', '西雅图', 'Seattle', 'US', 47.61, -122.33],
  ['portland', '波特兰', 'Portland', 'US', 45.52, -122.68],
  ['las-vegas', '拉斯维加斯', 'Las Vegas', 'US', 36.17, -115.14],
  ['phoenix', '凤凰城', 'Phoenix', 'US', 33.45, -112.07],
  ['salt-lake-city', '盐湖城', 'Salt Lake City', 'US', 40.76, -111.89],
  ['denver', '丹佛', 'Denver', 'US', 39.74, -104.99],
  ['dallas', '达拉斯', 'Dallas', 'US', 32.78, -96.8],
  ['kansas-city', '堪萨斯城', 'Kansas City', 'US', 39.1, -94.58],
  ['chicago', '芝加哥', 'Chicago', 'US', 41.88, -87.63],
  ['atlanta', '亚特兰大', 'Atlanta', 'US', 33.75, -84.39],
  ['miami', '迈阿密', 'Miami', 'US', 25.76, -80.19],
  ['ashburn', '阿什本', 'Ashburn', 'US', 39.04, -77.49],
  ['washington', '华盛顿', 'Washington', 'US', 38.91, -77.04],
  ['new-york', '纽约', 'New York', 'US', 40.71, -74.01],
  ['new-jersey', '新泽西', 'New Jersey', 'US', 40.73, -74.17],
  ['buffalo', '布法罗', 'Buffalo', 'US', 42.89, -78.88],
  ['toronto', '多伦多', 'Toronto', 'CA', 43.65, -79.38],
  ['montreal', '蒙特利尔', 'Montreal', 'CA', 45.5, -73.57],
  ['vancouver', '温哥华', 'Vancouver', 'CA', 49.28, -123.12],
  ['mexico-city', '墨西哥城', 'Mexico City', 'MX', 19.43, -99.13],
  ['sao-paulo', '圣保罗', 'Sao Paulo', 'BR', -23.55, -46.63],
  ['santiago', '圣地亚哥', 'Santiago', 'CL', -33.45, -70.67],
  ['buenos-aires', '布宜诺斯艾利斯', 'Buenos Aires', 'AR', -34.6, -58.38],
  ['london', '伦敦', 'London', 'GB', 51.51, -0.13],
  ['manchester', '曼彻斯特', 'Manchester', 'GB', 53.48, -2.24],
  ['dublin', '都柏林', 'Dublin', 'IE', 53.35, -6.26],
  ['paris', '巴黎', 'Paris', 'FR', 48.86, 2.35],
  ['amsterdam', '阿姆斯特丹', 'Amsterdam', 'NL', 52.37, 4.9],
  ['brussels', '布鲁塞尔', 'Brussels', 'BE', 50.85, 4.35],
  ['frankfurt', '法兰克福', 'Frankfurt', 'DE', 50.11, 8.68],
  ['dusseldorf', '杜塞尔多夫', 'Dusseldorf', 'DE', 51.23, 6.77],
  ['nuremberg', '纽伦堡', 'Nuremberg', 'DE', 49.45, 11.08],
  ['falkenstein', '法尔肯施泰因', 'Falkenstein', 'DE', 50.48, 12.37],
  ['berlin', '柏林', 'Berlin', 'DE', 52.52, 13.4],
  ['munich', '慕尼黑', 'Munich', 'DE', 48.14, 11.58],
  ['hamburg', '汉堡', 'Hamburg', 'DE', 53.55, 9.99],
  ['zurich', '苏黎世', 'Zurich', 'CH', 47.38, 8.54],
  ['vienna', '维也纳', 'Vienna', 'AT', 48.21, 16.37],
  ['milan', '米兰', 'Milan', 'IT', 45.46, 9.19],
  ['madrid', '马德里', 'Madrid', 'ES', 40.42, -3.7],
  ['lisbon', '里斯本', 'Lisbon', 'PT', 38.72, -9.14],
  ['warsaw', '华沙', 'Warsaw', 'PL', 52.23, 21.01],
  ['prague', '布拉格', 'Prague', 'CZ', 50.08, 14.44],
  ['bucharest', '布加勒斯特', 'Bucharest', 'RO', 44.43, 26.1],
  ['sofia', '索非亚', 'Sofia', 'BG', 42.7, 23.32],
  ['helsinki', '赫尔辛基', 'Helsinki', 'FI', 60.17, 24.94],
  ['stockholm', '斯德哥尔摩', 'Stockholm', 'SE', 59.33, 18.07],
  ['oslo', '奥斯陆', 'Oslo', 'NO', 59.91, 10.75],
  ['copenhagen', '哥本哈根', 'Copenhagen', 'DK', 55.68, 12.57],
  ['moscow', '莫斯科', 'Moscow', 'RU', 55.76, 37.62],
  ['saint-petersburg', '圣彼得堡', 'Saint Petersburg', 'RU', 59.93, 30.34],
  ['kyiv', '基辅', 'Kyiv', 'UA', 50.45, 30.52],
  ['johannesburg', '约翰内斯堡', 'Johannesburg', 'ZA', -26.2, 28.05],
  ['cairo', '开罗', 'Cairo', 'EG', 30.04, 31.24],
  ['lagos', '拉各斯', 'Lagos', 'NG', 6.52, 3.38],
  ['sydney', '悉尼', 'Sydney', 'AU', -33.87, 151.21],
  ['melbourne', '墨尔本', 'Melbourne', 'AU', -37.81, 144.96],
  ['auckland', '奥克兰', 'Auckland', 'NZ', -36.85, 174.76],
]

export const builtinCities: City[] = CITY_TABLE.map(([id, name, , country, lat, lng]) => ({ id, name, country, lat, lng }))

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
function pattern(word: string): Pattern {
  const latin = LATIN_RE.test(word)
  return { key: latin ? tokens(word) : fold(word), latin }
}

const cityIndex = new Map(CITY_TABLE.flatMap(([id, name, english], index) =>
  [id, name, english].map(word => [pattern(word).key, builtinCities[index]!] as const)))

/** 内置城市的中文名、英文名或 id → 城市。 */
export function findBuiltinCity(text: string): City | null {
  return cityIndex.get(pattern(text.trim()).key) ?? null
}

const COORD_RE = /^(.+?)@\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)$/

/**
 * 解析匹配规则，每行 `关键词1,关键词2 = 城市`，# 开头为注释。
 * 城市写内置城市的中文名或英文名，或 `显示名@纬度,经度`；写 `-` 表示这些关键词不识别城市。
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
 * 按节点名识别城市：规则从上到下，第一条命中的生效；`-` 规则命中即不识别。
 * 内置城市与节点国家不一致时跳过该条，避免把美国节点名里的 SEA 当成别处；自定义坐标不校验国家。
 */
export function matchNodeCity(name: string, country: string, rules: CityRule[]): City | null {
  const tokenized = tokens(name)
  const folded = fold(name)
  const code = country.trim().toUpperCase()
  for (const rule of rules) {
    if (rule.city?.country && code && rule.city.country !== code) continue
    const hit = rule.keywords.some((keyword) => {
      const { key, latin } = pattern(keyword)
      return (latin ? tokenized : folded).includes(key)
    })
    if (hit) return rule.city
  }
  return null
}
