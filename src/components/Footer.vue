<script setup lang="ts">
import type { VersionInfo } from '@/utils/api'
import { computed, onMounted, ref } from 'vue'
import { DataTooltip } from '@/components/ui/data-tooltip'
import { getSharedApi } from '@/utils/api'

const api = getSharedApi()

const buildVersion = __BUILD_VERSION__
const buildGitHash = __BUILD_GIT_HASH__

const serverVersion = ref<VersionInfo | null>(null)

onMounted(async () => {
  try {
    serverVersion.value = await api.getVersion()
  }
  catch {
    // 静默失败
  }
})

const formattedServerVersion = computed(() => serverVersion.value?.version ?? '')
</script>

<template>
  <footer data-app-footer class="app-footer w-full max-w-[1280px] mx-auto p-4">
    <div class="flex w-full flex-row justify-between gap-4 text-xs text-muted-foreground">
      <div class="flex gap-1 items-center">
        Powered by
        <DataTooltip
          as="span"
          placement="top"
          :content="formattedServerVersion"
        >
          <a
            href="https://github.com/monitor-probe/monitor" target="_blank" rel="noopener noreferrer"
            class="transition-opacity hover:opacity-80"
          >
            <span class="font-medium text-foreground">极简探针 Monitor</span>
          </a>
        </DataTooltip>
      </div>
      <div class="flex flex-wrap gap-1 items-center justify-end text-right">
        Theme by
        <DataTooltip
          as="span"
          placement="top"
          :content="`v${buildVersion}\n${buildGitHash}`"
        >
          <a
            href="https://github.com/Gongsc/Theme-Glassmorphism" target="_blank" rel="noopener noreferrer"
            class="transition-opacity hover:opacity-80"
          >
            <span class="font-medium text-foreground">Glassmorphism</span>
          </a>
        </DataTooltip>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  padding-right: max(1rem, env(safe-area-inset-right, 0px));
  padding-right: max(1rem, var(--komari-safe-area-right, env(safe-area-inset-right, 0px)));
  padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  padding-bottom: calc(1rem + var(--komari-safe-area-bottom, env(safe-area-inset-bottom, 0px)));
  padding-left: max(1rem, env(safe-area-inset-left, 0px));
  padding-left: max(1rem, var(--komari-safe-area-left, env(safe-area-inset-left, 0px)));
}
</style>
