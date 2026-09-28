import { resolveSiteIcon, SITE_ICON_MAX_LENGTH, SITE_ICON_SIZE } from '@/monitor/siteIcon'

const MAX_SOURCE_BYTES = 8 * 1024 * 1024

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  const image = new Image()
  return new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('无法读取该图片，请换用 PNG、JPEG、WebP 或 SVG 格式。'))
    image.src = url
  }).finally(() => URL.revokeObjectURL(url))
}

// 等比缩放后居中绘制，保留透明背景；JPEG 不支持透明，另铺白色底。
function render(image: HTMLImageElement, size: number, type: 'image/png' | 'image/jpeg'): string {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context)
    throw new Error('当前浏览器不支持图片处理。')
  if (type === 'image/jpeg') {
    context.fillStyle = '#fff'
    context.fillRect(0, 0, size, size)
  }
  const width = image.naturalWidth || size
  const height = image.naturalHeight || size
  const scale = Math.min(size / width, size / height)
  const drawWidth = width * scale
  const drawHeight = height * scale
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, (size - drawWidth) / 2, (size - drawHeight) / 2, drawWidth, drawHeight)
  return canvas.toDataURL(type, 0.86)
}

/**
 * 将上传的图片转换为可保存在站点配置中的图标（data URL）。
 * 依次尝试 180×180 PNG、128×128 PNG 与 180×180 JPEG，取第一个不超过体积上限的结果。
 */
export async function imageFileToSiteIcon(file: File): Promise<string> {
  if (!file.type.startsWith('image/'))
    throw new Error('请选择图片文件。')
  if (file.size > MAX_SOURCE_BYTES)
    throw new Error('图片超过 8 MiB，请先压缩后再上传。')

  const image = await loadImage(file)
  const attempts: Array<[number, 'image/png' | 'image/jpeg']> = [
    [SITE_ICON_SIZE, 'image/png'],
    [128, 'image/png'],
    [SITE_ICON_SIZE, 'image/jpeg'],
  ]
  for (const [size, type] of attempts) {
    const dataUrl = render(image, size, type)
    if (dataUrl.length <= SITE_ICON_MAX_LENGTH && resolveSiteIcon(dataUrl))
      return dataUrl
  }
  throw new Error(`图片压缩后仍超过 ${SITE_ICON_MAX_LENGTH / 1024} KiB，请换用更简单的图片。`)
}
