// Tab identifiers are distinct from arbitrary hub group names.
export const ALL_GROUPS = 'all'
export const UNGROUPED = 'ungrouped'
export function groupTabId(group: string): string {
  return `group:${group}`
}

export function parseNodeGroups(group: string | null | undefined): string[] {
  // Monitor has one group per node. Preserve whitespace and semicolons in names.
  return typeof group === 'string' && group !== '' ? [group] : []
}

export function isNodeInGroup(group: string | null | undefined, selectedGroup: string): boolean {
  if (selectedGroup === ALL_GROUPS)
    return true
  const groups = parseNodeGroups(group)
  if (selectedGroup === UNGROUPED)
    return groups.length === 0
  return groups.some(name => groupTabId(name) === selectedGroup)
}

export function buildGroupTabs(nodes: readonly { group?: string | null }[]): { tab: string, name: string }[] {
  const groups = [...new Set(nodes.flatMap(node => parseNodeGroups(node.group)))]
  const tabs = [{ tab: '全部节点', name: ALL_GROUPS }]
  if (groups.length === 0)
    return tabs
  tabs.push(...groups.map(group => ({
    tab: ['全部节点', '未分组'].includes(group) ? `${group}（分组）` : group,
    name: groupTabId(group),
  })))
  if (nodes.some(node => parseNodeGroups(node.group).length === 0))
    tabs.push({ tab: '未分组', name: UNGROUPED })
  return tabs
}
