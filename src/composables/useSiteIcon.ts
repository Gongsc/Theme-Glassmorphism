import { watch } from 'vue'
import { useAppStore } from '@/stores/app'

interface IconLink {
  element: HTMLLinkElement
  href: string
  type: string | null
}

function captureLink(rel: string): IconLink | null {
  const element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  return element ? { element, href: element.getAttribute('href') ?? '', type: element.getAttribute('type') } : null
}

function restore(link: IconLink): void {
  link.element.setAttribute('href', link.href)
  if (link.type)
    link.element.setAttribute('type', link.type)
  else
    link.element.removeAttribute('type')
}

/**
 * 按站点设置替换浏览器标签页与 iOS 主屏幕图标，清空设置时恢复内置图标。
 * 页面外壳是静态文件，配置要等脚本加载后才读取，首次加载会短暂显示内置图标。
 */
export function useSiteIcon(): void {
  const appStore = useAppStore()
  const links = [captureLink('icon'), captureLink('apple-touch-icon')].filter((link): link is IconLink => link !== null)

  watch(() => appStore.siteIconUrl, (url) => {
    for (const link of links) {
      if (!url) {
        restore(link)
        continue
      }
      link.element.setAttribute('href', url)
      // 内置图标声明了 image/svg+xml；自定义图标格式不定，交由浏览器按内容识别。
      link.element.removeAttribute('type')
    }
  }, { immediate: true })
}
