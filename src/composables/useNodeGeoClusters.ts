import type { NodeData } from '@/stores/nodes'
import { computed } from 'vue'
import { matchNodeCity, parseCityRules } from '@/monitor/cityMatch'
import { useAppStore } from '@/stores/app'
import { useNodesStore } from '@/stores/nodes'
import { getCoordByCode, getCountryCodeFromRegion } from '@/utils/geoHelper'
import { getRegionDisplayName } from '@/utils/regionHelper'

interface UseNodeGeoClustersOptions {
  nodes?: () => NodeData[] | undefined
}

export interface RegionCluster {
  id: string
  code: string
  coord: [number, number]
  label: string
  servers: number
  onlineServers: number
  /** 按节点名识别出的城市；为 false 时是国家中心点。 */
  city?: boolean
}

interface ClusterSummary {
  clusters: RegionCluster[]
  totalServers: number
  onlineServers: number
}

export function useNodeGeoClusters(options: UseNodeGeoClustersOptions = {}) {
  const nodesStore = useNodesStore()
  const appStore = useAppStore()
  const showCity = computed(() => appStore.publicSettings?.theme_settings?.earthShowCity === true)
  const cityRules = computed(() => parseCityRules(String(appStore.publicSettings?.theme_settings?.earthCityRules ?? '')).rules)

  const displayNodes = computed(() => options.nodes?.() ?? nodesStore.visibleNodes)

  function nodeClusterInfo(node: NodeData): { id: string, code: string, coord: [number, number], label: string, city?: boolean } | null {
    const countryCode = getCountryCodeFromRegion(node.region)

    if (showCity.value) {
      const city = matchNodeCity(node.name, countryCode ?? '', cityRules.value)
      if (city) {
        const code = (countryCode || city.country).toUpperCase()
        return { id: `${(code || 'xx').toLowerCase()}-city-${city.id}`, code, coord: [city.lat, city.lng], label: city.name, city: true }
      }
    }

    if (countryCode) {
      const coord = getCoordByCode(countryCode)
      if (coord)
        return { id: countryCode.toLowerCase(), code: countryCode, coord, label: getRegionDisplayName(node.region) || getRegionDisplayName(countryCode) || '' }
    }

    return null
  }

  const clusterSummary = computed<ClusterSummary>(() => {
    const clustersById = new Map<string, RegionCluster>()
    let onlineServers = 0

    for (const node of displayNodes.value) {
      if (node.online)
        onlineServers += 1

      const info = nodeClusterInfo(node)
      if (!info)
        continue

      let cluster = clustersById.get(info.id)
      if (!cluster) {
        cluster = { id: info.id, code: info.code, coord: info.coord, label: info.label, servers: 0, onlineServers: 0, city: info.city }
        clustersById.set(info.id, cluster)
      }
      cluster.servers += 1

      if (node.online)
        cluster.onlineServers += 1
    }

    return {
      clusters: Array.from(clustersById.values()).sort((a, b) => b.servers - a.servers),
      totalServers: displayNodes.value.length,
      onlineServers,
    }
  })

  const regionClusters = computed<RegionCluster[]>(() => clusterSummary.value.clusters)
  const totalServers = computed(() => clusterSummary.value.totalServers)
  const onlineServers = computed(() => clusterSummary.value.onlineServers)
  const offlineServers = computed(() => totalServers.value - onlineServers.value)

  function clusterKey(cluster: RegionCluster) {
    return `${cluster.id}:${cluster.coord[0]},${cluster.coord[1]}:${cluster.label}:${cluster.city ? 1 : 0}:${cluster.servers}:${cluster.onlineServers}`
  }

  return {
    displayNodes,
    regionClusters,
    totalServers,
    onlineServers,
    offlineServers,
    clusterKey,
  }
}
