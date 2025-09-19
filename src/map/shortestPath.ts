// Simple A* implementation for a graph represented as GeoJSON-like nodes and edges
// Graph format (testGraph.json): { "nodes": [{id, coord:[lng,lat]}], "edges": [{id, from, to, weight, tags: []}] }

type Node = { id: string | number, coord: [number, number] }
type Edge = { id: string | number, from: string | number, to: string | number, weight: number, tags?: string[] }

type Graph = { nodes: Node[], edges: Edge[] }

function heuristic(a: [number, number], b: [number, number]) {
    // Euclidean on lon/lat (not geodesic) - OK for small indoor graphs
    const dx = a[0] - b[0]
    const dy = a[1] - b[1]
    return Math.sqrt(dx * dx + dy * dy)
}

// Simple binary heap
class MinHeap<T> {
    heap: Array<{ key: number, val: T }>
    constructor() { this.heap = [] }
    push(key: number, val: T) { this.heap.push({ key, val }); this._siftUp(); }
    pop(): { key: number, val: T } | undefined { if (!this.heap.length) return undefined; const top = this.heap[0]; const last = this.heap.pop()!; if (this.heap.length) { this.heap[0] = last; this._siftDown() } return top }
    _siftUp() { let i = this.heap.length - 1; while (i > 0) { const p = Math.floor((i - 1) / 2); if (this.heap[p].key <= this.heap[i].key) break;[this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]]; i = p } }
    _siftDown() { let i = 0; const n = this.heap.length; while (true) { let l = 2 * i + 1, r = 2 * i + 2, smallest = i; if (l < n && this.heap[l].key < this.heap[smallest].key) smallest = l; if (r < n && this.heap[r].key < this.heap[smallest].key) smallest = r; if (smallest === i) break;[this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]]; i = smallest } }
}

export function shortestPath(graph: Graph, startId: string | number, endId: string | number, excludeTags: string[] = [], excludedEdgeIds: Set<string | number> | null = null) {
    console.log('[shortestPath] start', { startId, endId, excludeTags })
    const nodesById = new Map<string | number, Node>()
    for (const n of graph.nodes) nodesById.set(n.id, n)
    console.log('[shortestPath] nodes', Array.from(nodesById.keys()))
    console.log('[shortestPath] raw edges', graph.edges)
    const edgesOut = new Map<string | number, Edge[]>()
    for (const e of graph.edges) {
        if (excludeTags && excludeTags.length && e.tags && e.tags.some(t => excludeTags.includes(t))) continue
        if (excludedEdgeIds && excludedEdgeIds.has(e.id)) continue
        if (!edgesOut.has(e.from)) edgesOut.set(e.from, [])
        edgesOut.get(e.from)!.push(e)
        // assume undirected
        if (!edgesOut.has(e.to)) edgesOut.set(e.to, [])
        edgesOut.get(e.to)!.push({ ...e, from: e.to, to: e.from })
    }
    console.log('[shortestPath] adjacency keys', Array.from(edgesOut.keys()).map(k => String(k)))
    console.log('[shortestPath] edgesOut[startId]', edgesOut.get(startId))
    const start = nodesById.get(startId)
    const end = nodesById.get(endId)
    if (!start || !end) { console.warn('[shortestPath] start or end not found', { startExists: !!start, endExists: !!end }); return null }
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
        console.log('[shortestPath] pop', current)
        if (current === endId) break
        if (closed.has(current)) continue
        closed.add(current)
        const neighbors = edgesOut.get(current) || []
        console.log('[shortestPath] neighbors for', current, neighbors)
        for (const edge of neighbors) {
            console.log('[shortestPath] evaluating edge', edge)
            const neighbor = edge.to
            if (closed.has(neighbor)) { console.log('[shortestPath] neighbor already closed', neighbor); continue }
            const currentG = g.get(current) ?? Infinity
            const neighborG = g.get(neighbor) ?? Infinity
            const tentative = currentG + (edge.weight ?? 1)
            console.log('[shortestPath] scores', { current, neighbor, currentG, neighborG, tentative })
            if (tentative < neighborG) {
                came.set(neighbor, current as string | number)
                console.log('[shortestPath] set came', neighbor, 'from', current, 'g=', tentative)
                g.set(neighbor, tentative)
                const ncoord = nodesById.get(neighbor)!.coord
                f.set(neighbor, tentative + heuristic(ncoord, end.coord))
                open.push(f.get(neighbor)!, neighbor)
            } else {
                console.log('[shortestPath] not improving neighbor', neighbor, 'existingG=', neighborG)
            }
        }
    }
    if (!came.has(endId)) return null
    const path: Array<string | number> = []
    let cur: any = endId
    while (cur !== undefined && cur !== startId) { path.push(cur); cur = came.get(cur) }
    path.push(startId)
    path.reverse()
    // compute total cost (sum of edge weights along path)
    let cost = 0
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1]
        const b = path[i]
        // find edge
        const edge = graph.edges.find((ee: any) => ((String(ee.from) === String(a) && String(ee.to) === String(b)) || (String(ee.from) === String(b) && String(ee.to) === String(a))))
        if (edge) cost += edge.weight ?? 0
    }
    return { path, cost }
}

// Simple k-shortest using edge-removal heuristic: compute shortest path, then for each edge in it try removing that edge and compute alternative paths.
export function kShortestPaths(graph: Graph, startId: string | number, endId: string | number, k: number = 3, excludeTags: string[] = []) {
    const results: Array<{ path: Array<string | number>, cost: number }> = []
    const primary = shortestPath(graph, startId, endId, excludeTags, null)
    if (!primary) return results
    results.push(primary)
    const seen = new Set<string>()
    function pathKey(p: any) { return (p.path || p).join('->') }
    seen.add(pathKey(primary))
    // try removing one edge at a time from primary path
    const edgesToTry: Array<{ a: string | number, b: string | number, id?: string | number }> = []
    for (let i = 1; i < primary.path.length; i++) {
        const a = primary.path[i - 1]
        const b = primary.path[i]
        // find the original edge id if possible
        const edge = graph.edges.find((ee: any) => ((String(ee.from) === String(a) && String(ee.to) === String(b)) || (String(ee.from) === String(b) && String(ee.to) === String(a))))
        edgesToTry.push({ a, b, id: edge ? edge.id : undefined })
    }
    for (const toRemove of edgesToTry) {
        if (results.length >= k) break
        const excluded = new Set<string | number>()
        if (toRemove.id != null) excluded.add(toRemove.id)
        // also exclude any edge that matches that pair (in case id missing)
        const alt = shortestPath(graph, startId, endId, excludeTags, excluded)
        if (alt) {
            const key = pathKey(alt)
            if (!seen.has(key)) { results.push(alt); seen.add(key) }
        }
    }
    return results
}
