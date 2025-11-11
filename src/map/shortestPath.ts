// Simple A* implementation on a light-weight graph type
type Node = { id: string | number, coord: [number, number] }
type Edge = { id: string | number, from: string | number, to: string | number, weight: number, tags?: string[] }
type Graph = { nodes: Node[], edges: Edge[] }

import { MinHeap } from './heap'
import { heuristic } from './heuristic'

// Caches for graph indices to avoid rebuilding on each call
const nodesByIdCache: WeakMap<Graph, Map<string | number, Node>> = new WeakMap()
const edgesOutCache: WeakMap<Graph, Map<string | number, Edge[]>> = new WeakMap()
const shortestPrimaryCache: WeakMap<Graph, Map<string, { path: Array<string | number>, cost: number } | null>> = new WeakMap()

function getNodesById(graph: Graph): Map<string | number, Node> {
    let m = nodesByIdCache.get(graph)
    if (m) return m
    m = new Map<string | number, Node>()
    for (const n of graph.nodes) m.set(n.id, n)
    nodesByIdCache.set(graph, m)
    return m
}

function getEdgesOut(graph: Graph): Map<string | number, Edge[]> {
    let m = edgesOutCache.get(graph)
    if (m) return m
    m = new Map<string | number, Edge[]>()
    for (const e of graph.edges) {
        if (!m.has(e.from)) m.set(e.from, [])
        m.get(e.from)!.push(e)
        // also add reverse edge reference for undirected traversal
        if (!m.has(e.to)) m.set(e.to, [])
        m.get(e.to)!.push({ ...e, from: e.to, to: e.from })
    }
    edgesOutCache.set(graph, m)
    return m
}


export function shortestPath(graph: Graph, startId: string | number, endId: string | number, excludeTags: string[] = [], excludedEdgeIds: Set<string | number> | null = null) {
    const nodesById = getNodesById(graph)
    const edgesOut = getEdgesOut(graph)
    // Fast-path cache only for primary (no excluded edges)
    const canUseCache = !excludedEdgeIds || excludedEdgeIds.size === 0
    if (canUseCache) {
        let gCache = shortestPrimaryCache.get(graph)
        if (!gCache) { gCache = new Map(); shortestPrimaryCache.set(graph, gCache) }
        const key = `${startId}|${endId}|${(excludeTags || []).slice().sort().join(',')}`
        if (gCache.has(key)) return gCache.get(key) || null
        // compute and store below
        const res = _shortestPathCore(nodesById, edgesOut, startId, endId, excludeTags, null)
        gCache.set(key, res)
        return res
    }
    return _shortestPathCore(nodesById, edgesOut, startId, endId, excludeTags, excludedEdgeIds)
}

function _shortestPathCore(
    nodesById: Map<string | number, Node>,
    edgesOut: Map<string | number, Edge[]>,
    startId: string | number,
    endId: string | number,
    excludeTags: string[] = [],
    excludedEdgeIds: Set<string | number> | null = null
) {
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
            if (excludedEdgeIds && excludedEdgeIds.has(edge.id)) continue
            if (excludeTags && excludeTags.length && edge.tags && edge.tags.some(t => excludeTags.includes(t))) continue
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
    // Compute cost using precomputed pair weights
    let cost = 0
    // We no longer rely on graph object here; cost computed from edgesOut snapshot.
    const pairWeight = _getPairWeightLookupFromEdgesOut(edgesOut)
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i]
        const key = `${a}->${b}`
        const w = pairWeight.get(key)
        cost += (w != null ? w : 0)
    }
    return { path, cost }
}

export function kShortestPaths(graph: Graph, startId: string | number, endId: string | number, k: number = 3, excludeTags: string[] = []) {
    const results: Array<{ path: Array<string | number>, cost: number }> = []
    const primary = shortestPath(graph, startId, endId, excludeTags, null)
    if (!primary) return results
    results.push(primary)
    const seen = new Set<string>()
    const keyOf = (p: any) => (p.path || p).join('->')
    seen.add(keyOf(primary))
    const edgesToTry: Array<{ a: string | number, b: string | number, id?: string | number }> = []
    // Precompute quick pair->edgeId lookup from cached edgesOut
    const edgesOut = getEdgesOut(graph)
    const pairToEdgeId = new Map<string, string | number>()
    for (const [from, arr] of edgesOut.entries()) {
        for (const e of arr) {
            const key = `${from}->${e.to}`
            if (!pairToEdgeId.has(key)) pairToEdgeId.set(key, e.id)
        }
    }
    for (let i = 1; i < primary.path.length; i++) {
        const a = primary.path[i - 1], b = primary.path[i]
        const id = pairToEdgeId.get(`${a}->${b}`) || pairToEdgeId.get(`${b}->${a}`)
        edgesToTry.push({ a, b, id })
    }
    for (const toRemove of edgesToTry) {
        if (results.length >= k) break
        const excluded = new Set<string | number>()
        if (toRemove.id != null) excluded.add(toRemove.id)
        const alt = shortestPath(graph, startId, endId, excludeTags, excluded)
        if (alt) { const key = keyOf(alt); if (!seen.has(key)) { results.push(alt); seen.add(key) } }
    }
    return results
}

// Build a quick lookup of weights from edgesOut map without iterating original graph every time
function _getPairWeightLookupFromEdgesOut(edgesOut: Map<string | number, Edge[]>): Map<string, number> {
    const m = new Map<string, number>()
    for (const [from, arr] of edgesOut.entries()) {
        for (const e of arr) {
            const key = `${from}->${e.to}`
            if (!m.has(key)) m.set(key, e.weight)
        }
    }
    return m
}
