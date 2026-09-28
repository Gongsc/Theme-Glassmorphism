import type { NodeData } from '@/stores/nodes'
import type { ProviderResolveResult } from '@/utils/providerInfo'
import { resolveProviderInfo } from '@/utils/providerInfo'

/** 厂商只按名称、备注、分组和地区文本识别；节点 IP 不会发往任何第三方查询服务。 */
export interface NodeProviderMetadata {
  provider: ProviderResolveResult | null
}

export function getProviderMetadataText(node: NodeData): string {
  return [node.name, node.remark, node.group, node.region]
    .filter(Boolean)
    .join(' ')
}

export function buildNodeProviderMetadata(node: NodeData, customAliases: string): NodeProviderMetadata {
  return {
    provider: resolveProviderInfo({
      metadata: getProviderMetadataText(node),
      customAliases,
    }),
  }
}
