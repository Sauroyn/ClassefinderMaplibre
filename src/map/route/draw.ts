import { haversine } from '../measure'

export function buildFeatureCollections(graph: any, ks: Array<{ path: any[], cost: number }>, coveredOnly: boolean, combinedCoords: number[][]) {
    const nodeById = new Map<string, any>()
    for (const n of graph.nodes) nodeById.set(String(n.id), n)
    const routes: Array<{ id: string, geo: any, cost: number, distance: number }> = []
    for (let idx = 0; idx < ks.length; idx++) {
        const item = ks[idx]
        const ids = item.path as string[]
        const features: any[] = []
        for (let i = 1; i < ids.length; i++) {
            const aId = String(ids[i - 1])
            const bId = String(ids[i])
            const aNode = nodeById.get(aId)
            const bNode = nodeById.get(bId)
            let edge = graph.edges.find((e: any) => (String(e.from) === aId && String(e.to) === bId) || (String(e.from) === bId && String(e.to) === aId))
            let segCoords: number[][] = []
            const props: any = {}
            if (edge && edge.raw && edge.raw.geometry && edge.raw.geometry.type === 'LineString') {
                segCoords = edge.raw.geometry.coordinates.slice()
                if (edge.raw.properties) {
                    Object.assign(props, edge.raw.properties)
                    if (props.level != null && typeof props.level === 'string') {
                        const n = Number(props.level); if (!Number.isNaN(n)) props.level = n
                    }
                    if (props.levels && Array.isArray(props.levels)) {
                        props.levels = props.levels.map((v: any) => typeof v === 'string' ? (Number.isNaN(Number(v)) ? v : Number(v)) : v)
                    }
                }
                if (coveredOnly) {
                    const cov = props.covered ?? (edge.raw.properties && edge.raw.properties.covered)
                    const covTrue = cov === true || String(cov).toLowerCase() === 'yes' || String(cov).toLowerCase() === 'true'
                    if (!covTrue) segCoords = []
                }
            } else if (aNode && bNode) {
                segCoords = [aNode.coord, bNode.coord]
            }
            if (segCoords && segCoords.length) {
                features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: segCoords }, properties: props })
                for (const c of segCoords) combinedCoords.push(c)
            }
        }
        const geo = { type: 'FeatureCollection', features }
        let dist = 0
        for (const f of features) {
            if (f.geometry && f.geometry.type === 'LineString') {
                const coords = f.geometry.coordinates
                for (let j = 1; j < coords.length; j++) dist += haversine(coords[j - 1] as [number, number], coords[j] as [number, number])
            }
        }
        routes.push({ id: `route-planner-${idx}`, geo, cost: item.cost, distance: dist })
    }
    return routes
}

export function drawRoutes(map: any, routes: Array<{ id: string, geo: any }>) {
    for (let idx = 0; idx < routes.length; idx++) {
        const { id, geo } = routes[idx]
        try {
            if (map.getSource && map.getSource(id)) map.getSource(id).setData(geo)
            else if (map.addSource) map.addSource(id, { type: 'geojson', data: geo })
        } catch { }
        const layerId = `${id}-line`
        // Keep primary route in stable blue, alternatives in neutral grays
        const color = idx === 0 ? '#007bff' : (idx === 1 ? '#999999' : '#cccccc')
        const width = idx === 0 ? 18 : 12
        const opacity = idx === 0 ? 1 : 0.6
        try {
            if (!map.getLayer || !map.getLayer(layerId)) {
                map.addLayer({ id: layerId, type: 'line', source: id, paint: { 'line-color': color, 'line-width': width, 'line-opacity': opacity }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
            } else {
                map.setPaintProperty(layerId, 'line-color', color)
                map.setPaintProperty(layerId, 'line-width', width)
                map.setPaintProperty(layerId, 'line-opacity', opacity)
            }
        } catch { }
    }
    try { if (map.moveLayer) map.moveLayer('route-planner-0-line') } catch { }
}
