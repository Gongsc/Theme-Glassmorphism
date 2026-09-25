<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import MonitorSettings from '@/components/MonitorSettings.vue'
import VisitorInfo from '@/components/VisitorInfo.vue'
import { useVisitorAudit } from '@/composables/useVisitorAudit'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const appStore = useAppStore()
const { record: recordVisitorEvent } = useVisitorAudit()

const isScrolled = inject<ReturnType<typeof ref<boolean>>>('isScrolled', ref(false))

const siteFavicon = ref('/favicon.svg')

const actionButtons = computed(() => {
  const themeTitleMap = {
    auto: appStore.managedThemeMode === 'beijing'
      ? appStore.isBeijingDaytime ? '自动主题：北京时间日间' : '自动主题：北京时间夜间'
      : appStore.managedThemeMode === 'light' ? '自动主题：后台浅色' : '自动主题：后台深色',
    light: '浅色主题',
    dark: '深色主题',
  } as const

  const themeIconMap = {
    auto: appStore.isDark ? 'icon-park-outline:moon' : 'icon-park-outline:sun-one',
    light: 'icon-park-outline:sun-one',
    dark: 'icon-park-outline:moon',
  } as const

  const buttons: Array<{ title: string, icon: string, action: string, pressed?: boolean }> = []

  if (router.currentRoute.value.name === 'home' && appStore.homeToolsEnabled) {
    buttons.push({
      title: appStore.homeAdvancedToolsVisible ? '收起首页工具' : '显示首页工具',
      icon: 'tabler:tools',
      action: 'toggleHomeTools',
      pressed: appStore.homeAdvancedToolsVisible,
    })
  }

  buttons.push({
    title: `${themeTitleMap[appStore.themeMode]}（点击切换）`,
    icon: themeIconMap[appStore.themeMode],
    action: 'toggleTheme',
  })

  if (!appStore.loading && (appStore.privateFeaturesAllowed || !appStore.hideAdminEntryWhenLoggedOut)) {
    buttons.push({
      title: '后台管理',
      icon: 'icon-park-outline:setting',
      action: 'jumpToSetting',
    })
  }
  return buttons
})

function handleButtonClick(action: string) {
  switch (action) {
    case 'toggleTheme':
      appStore.updateThemeMode()
      void recordVisitorEvent({
        event: 'theme_mode_change',
        path: router.currentRoute.value.path,
        route: String(router.currentRoute.value.name ?? ''),
        target: appStore.themeMode,
      })
      break
    case 'toggleHomeTools':
      appStore.homeAdvancedToolsVisible = !appStore.homeAdvancedToolsVisible
      break
    case 'jumpToSetting':
      void recordVisitorEvent({
        event: 'admin_entry_click',
        path: router.currentRoute.value.path,
        route: String(router.currentRoute.value.name ?? ''),
      })
      location.href = '/admin'
      break
  }
}

const sitename = computed(() => appStore.publicSettings?.sitename || 'Monitor')
</script>

<template>
  <!-- 访客 IP 组件，全局悬浮 -->
  <VisitorInfo v-if="!appStore.loading && appStore.visitorInfoEnabled" />

  <div
    data-app-header
    class="app-header transition-all duration-200 top-0 sticky z-10 border-b border-transparent"
    :class="isScrolled ? '!border-slate-500/10 backdrop-blur-lg' : 'bg-transparent'"
  >
    <div data-app-header-content class="app-header-content flex-between h-14 max-w-[1280px] mx-auto">
      <div class="flex items-center gap-3 cursor-pointer" @click="router.push('/')">
        <!-- 图标自带圆角玻璃底，不再套圆形头像裁切 -->
        <img :src="siteFavicon" :alt="sitename" class="size-8 shrink-0" width="32" height="32">
        <h3 class="m-0 text-lg font-semibold">
          {{ sitename }}
        </h3>
      </div>
      <TooltipProvider :delay-duration="200">
        <div class="flex items-center gap-2">
          <MonitorSettings v-if="!appStore.loading && appStore.privateFeaturesAllowed" />
          <Tooltip v-for="button in actionButtons" :key="button.action">
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon-sm"
                :aria-label="button.title"
                :aria-pressed="button.pressed"
                :class="button.pressed && 'bg-background/70 text-selection'"
                @click="handleButtonClick(button.action)"
              >
                <Icon :icon="button.icon" :width="18" :height="18" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{ button.title }}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  </div>
</template>

<style scoped>
.app-header {
  padding-top: env(safe-area-inset-top, 0px);
  padding-top: var(--komari-safe-area-top, env(safe-area-inset-top, 0px));
}

.app-header-content {
  padding-right: max(1rem, env(safe-area-inset-right, 0px));
  padding-right: max(1rem, var(--komari-safe-area-right, env(safe-area-inset-right, 0px)));
  padding-left: max(1rem, env(safe-area-inset-left, 0px));
  padding-left: max(1rem, var(--komari-safe-area-left, env(safe-area-inset-left, 0px)));
}
</style>
