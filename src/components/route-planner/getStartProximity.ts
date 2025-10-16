import { haversine } from '../../map/measure'

export function getUserStartDistance(route: any, graph: any, user: [number, number]): number | null {
    if (!route || !graph || !Array.isArray(graph.nodes)) return null
    // Prefer the explicit user connector step if present as first step
    try {
        const first = Array.isArray(route.steps) && route.steps.length > 0 ? route.steps[0] : null
        if (first && Array.isArray(first.coords) && first.coords.length >= 1 && Array.isArray(first.coords[0])) {
            const startCoord = first.coords[0] as [number, number]
            return haversine(user, startCoord)
        }
    } catch { /* fall back below */ }

    // Fallback: compute distance to the graph start node of the path
    try {
        const startId = route.path && route.path[0] ? String(route.path[0]) : null
        if (!startId) return null
        const nodeById = new Map<string, any>(graph.nodes.map((n: any) => [String(n.id), n]))
        const startNode = nodeById.get(startId)
        if (startNode && Array.isArray(startNode.coord)) {
            return haversine(user, startNode.coord as [number, number])
        }
    } catch { }
    return null
}
