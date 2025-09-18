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
            const id = String(props.id ?? props.name ?? `node-${genNodeIdx++}`)
            nodes.push({ id, coord: f.geometry.coordinates, name: props.name ?? id, raw: f })
        }
    }

    function findNearestNode(coord: number[]) {
        if (nodes.length === 0) return null
        let best = nodes[0]
        let bestd = distance2(coord, best.coord)
        for (let i = 1; i < nodes.length; i++) {
            const d = distance2(coord, nodes[i].coord)
            if (d < bestd) { bestd = d; best = nodes[i] }
        }
        return best
    }

    let genEdgeIdx = 0
    for (const f of geo.features) {
        if (!f.geometry) continue
        const type = f.geometry.type
        const props = f.properties || {}
        if (type === 'LineString') {
            const coords = f.geometry.coordinates
            const id = String(props.id ?? props.name ?? `edge-${genEdgeIdx++}`)
            const weight = props.weight ?? 0
            let from = props.from != null ? String(props.from) : null
            let to = props.to != null ? String(props.to) : null

            if (!from || !to) {
                const startCoord = coords[0]
                const endCoord = coords[coords.length - 1]
                const n1 = findNearestNode(startCoord)
                const n2 = findNearestNode(endCoord)
                if (n1) from = from ?? n1.id
                if (n2) to = to ?? n2.id
            }

            if (!from) {
                const nid = `node-gen-${genNodeIdx++}`
                const coord = coords[0]
                nodes.push({ id: nid, coord, name: nid, raw: null })
                from = nid
            }
            if (!to) {
                const nid = `node-gen-${genNodeIdx++}`
                const coord = coords[coords.length - 1]
                nodes.push({ id: nid, coord, name: nid, raw: null })
                to = nid
            }

            let w = weight
            if (!w || w === 0) {
                let total = 0
                for (let i = 1; i < coords.length; i++) {
                    const a = coords[i - 1]
                    const b = coords[i]
                    total += Math.sqrt(distance2(a, b))
                }
                w = total
            }

            const tags = Array.isArray(props.tags) ? props.tags : (props.tags ? [props.tags] : [])
            edges.push({ id, from, to, weight: w, tags, raw: f })
        }
    }

    return { nodes, edges }

}
