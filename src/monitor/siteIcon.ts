// 站点图标：Hub 不提供图标设置和文件托管，图标地址保存在主题配置中。
// 接受 http(s) 地址、以 / 开头的站内路径，或设置面板上传生成的 base64 图片（data URL）。
// 主题配置整体受 64 KiB 限制，上传的图标另限 48 KiB，为公告等其他设置留出空间。

export const SITE_ICON_MAX_LENGTH = 48 * 1024
export const SITE_ICON_SIZE = 180

const DATA_URL = /^data:image\/(?:png|jpeg|webp|gif|svg\+xml|x-icon|vnd\.microsoft\.icon);base64,[A-Za-z0-9+/]+={0,2}$/

/** 返回可直接用作 src / href 的地址；空值或不合规的值返回空字符串，由调用方回退到内置图标。 */
export function resolveSiteIcon(value: unknown): string {
  if (typeof value !== 'string')
    return ''
  const source = value.trim()
  if (!source || source.length > SITE_ICON_MAX_LENGTH)
    return ''
  if (source.startsWith('data:'))
    return DATA_URL.test(source) ? source : ''
  // 站内路径必须以单个 / 开头；// 开头是协议相对的外部地址，交给下面的 URL 校验。
  if (source.startsWith('/') && !source.startsWith('//'))
    return /[\s\\]/.test(source) ? '' : source
  try {
    const url = new URL(source)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  }
  catch {
    return ''
  }
}

/** 配置校验：留空表示使用内置图标，其余必须能解析为有效地址。 */
export function isValidSiteIconSetting(value: unknown): boolean {
  return typeof value === 'string' && (value.trim() === '' || resolveSiteIcon(value) !== '')
}
