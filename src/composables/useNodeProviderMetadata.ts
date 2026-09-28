import type { MaybeRefOrGetter } from 'vue'
import type { NodeProviderMetadata } from '@/services/provider.service'
import type { NodeData } from '@/stores/nodes'
import { computed, markRaw, toValue } from 'vue'
import { buildNodeProviderMetadata } from '@/services/provider.service'

export type { NodeProviderMetadata } from '@/services/provider.service'

interface UseNodeProviderMetadataOptions {
  nodes: MaybeRefOrGetter<NodeData[]>
  customAliases: MaybeRefOrGetter<string>
  enabled?: MaybeRefOrGetter<boolean>
}

export function useNodeProviderMetadata(options: UseNodeProviderMetadataOptions) {
  const metadataByUuid = computed<Record<string, NodeProviderMetadata>>(() => {
    const enabled = options.enabled === undefined ? true : toValue(options.enabled)
    if (!enabled)
      return {}

    const customAliases = toValue(options.customAliases)
    return Object.fromEntries(toValue(options.nodes).map(node => [node.uuid, markRaw(buildNodeProviderMetadata(node, customAliases))]))
  })

  function getNodeProviderMetadata(node: NodeData): NodeProviderMetadata | null {
    return metadataByUuid.value[node.uuid] ?? null
  }

  return {
    metadataByUuid,
    getNodeProviderMetadata,
  }
}
