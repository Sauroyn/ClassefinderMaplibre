import { MinHeap } from './heap'
import { heuristic } from './heuristic'

type Node = { id: string | number, coord: [number, number] }
type Edge = { id: string | number, from: string | number, to: string | number, weight: number, tags?: string[] }

type Graph = { nodes: Node[], edges: Edge[] }

export function shortestPathAstar(graph: Graph, startId: string | number, endId: string | number, excludeTags: string[] = []) {
    const nodesById = new Map<string | number, Node>()
    for (const n of graph.nodes) nodesById.set(n.id, n)
    const edgesOut = new Map<string | number, Edge[]>()
    for (const e of graph.edges) {
        if (excludeTags && excludeTags.length && e.tags && e.tags.some(t => excludeTags.includes(t))) continue
        if (!edgesOut.has(e.from)) edgesOut.set(e.from, [])
        edgesOut.get(e.from)!.push(e)
        if (!edgesOut.has(e.to)) edgesOut.set(e.to, [])
        edgesOut.get(e.to)!.push({ ...e, from: e.to, to: e.from })
    }
    const start = nodesById.get(startId)
    const end = nodesById.get(endId)
    if (!start || !end) return null
    const open = new MinHeap<string | number>()
    const g = new Map<string | number, number>()
    const f = new Map<string | number, number>()
    const came = new Map<string | number, string | number>()
    g.set(startId, 0)
    f.set(startId, heuristic(start.coord, end.coord))
    open.push(f.get(startId)!, startId)
    const closed = new Set<string | number>()
    while (true) {
        const top = open.pop()
        if (!top) break
        const current = top.val
        if (current === endId) break
        if (closed.has(current)) continue
        closed.add(current)
        const neighbors = edgesOut.get(current) || []
        for (const edge of neighbors) {
            const neighbor = edge.to
            if (closed.has(neighbor)) continue
            const currentG = g.get(current) ?? Infinity
            const neighborG = g.get(neighbor) ?? Infinity
            const tentative = currentG + (edge.weight ?? 1)
            if (tentative < neighborG) {
                came.set(neighbor, current as string | number)
                g.set(neighbor, tentative)
                const ncoord = nodesById.get(neighbor)!.coord
                f.set(neighbor, tentative + heuristic(ncoord, end.coord))
                open.push(f.get(neighbor)!, neighbor)
            }
        }
    }
    if (!came.has(endId)) return null
    const path: Array<string | number> = []
    let cur: any = endId
    while (cur !== undefined && cur !== startId) { path.push(cur); cur = came.get(cur) }
    path.push(startId)
    path.reverse()
    return path
}
