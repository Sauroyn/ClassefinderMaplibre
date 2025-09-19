export type Graph = { nodes: any[], edges: any[] }

export function distance2(a: number[], b: number[]) {
    const dx = a[0] - b[0]
    const dy = a[1] - b[1]
    return dx * dx + dy * dy
}

export function parseGeoJSON(geo: any): Graph {
    const nodes: any[] = []
    const edges: any[] = []
    if (!geo || !geo.features) return { nodes, edges }

    let genNodeIdx = 0
    for (const f of geo.features) {
        if (!f.geometry) continue
        const type = f.geometry.type
        const props = f.properties || {}
        if (type === 'Point') {
            // keep only minimal properties for nodes: id (name) and level
            const id = String(props.id ?? props.name ?? `node-${genNodeIdx++}`)
            const node: any = { id, coord: f.geometry.coordinates, name: props.name ?? id, raw: f }
            if (props.level != null) {
                const n = Number(props.level)
                node.level = Number.isFinite(n) ? n : props.level
            }
            nodes.push(node)
        }
    }

    // note: we match LineString endpoints to Point nodes by exact coordinate equality

    let genEdgeIdx = 0
    for (const f of geo.features) {
        if (!f.geometry) continue
        const type = f.geometry.type
        const props = f.properties || {}
        if (type === 'LineString') {
            const coords = f.geometry.coordinates
            const id = String(props.id ?? props.name ?? `edge-${genEdgeIdx++}`)
            // For connectivity, consider every vertex along the LineString.
            // Ensure there's a node for each coordinate (reuse existing nodes when coords match exactly),
            // then create edges between consecutive node IDs (per-segment). Each segment edge has its own small raw.geometry
            function coordEq(a: number[], b: number[]) { return a[0] === b[0] && a[1] === b[1] }

            // remove consecutive duplicate coordinates (zero-length segments)
            const cleanedCoords: number[][] = []
            for (let vi = 0; vi < coords.length; vi++) {
                const coord = coords[vi]
                if (vi === 0) cleanedCoords.push(coord)
                else {
                    const prev = coords[vi - 1]
                    if (!(coord[0] === prev[0] && coord[1] === prev[1])) cleanedCoords.push(coord)
                }
            }

            const vertexNodeIds: string[] = []
            for (let vi = 0; vi < cleanedCoords.length; vi++) {
                const coord = cleanedCoords[vi]
                let found: any = null
                for (const n of nodes) {
                    if (coordEq(n.coord, coord)) { found = n; break }
                }
                if (found) {
                    vertexNodeIds.push(found.id)
                } else {
                    const nid = `node-gen-${genNodeIdx++}`
                    nodes.push({ id: nid, coord, name: nid, raw: null })
                    vertexNodeIds.push(nid)
                }
            }

            // compute per-segment weights (and create an edge per consecutive pair)
            const tags: string[] = Array.isArray(props.tags) ? (props.tags as string[]).slice() : (props.tags ? [String(props.tags)] : [])
            // detect 'highway: steps' and add a 'steps' tag for convenience
            if (props.highway && String(props.highway).toLowerCase() === 'steps' && !tags.some((t: string) => String(t).toLowerCase() === 'steps')) tags.push('steps')
            for (let i = 1; i < vertexNodeIds.length; i++) {
                const from = vertexNodeIds[i - 1]
                const to = vertexNodeIds[i]
                if (from === to) continue
                const a = cleanedCoords[i - 1]
                const b = cleanedCoords[i]
                const segWeight = Math.sqrt(distance2(a, b))
                if (!isFinite(segWeight) || segWeight === 0) continue
                const segId = `${id}-${i - 1}`
                const rawSeg = { type: 'Feature', geometry: { type: 'LineString', coordinates: [a, b] }, properties: props }
                edges.push({ id: segId, from, to, weight: segWeight, tags, raw: rawSeg })
            }
        }
    }

    return { nodes, edges }

}
