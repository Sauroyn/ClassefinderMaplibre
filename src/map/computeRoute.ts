import { kShortestPaths } from './shortestPath'

function haversine(a: [number, number], b: [number, number]) {
    const toRad = (v: number) => v * Math.PI / 180
    const R = 6371000 // meters
    const dLat = toRad(b[1] - a[1])
    const dLon = toRad(b[0] - a[0])
    const lat1 = toRad(a[1])
    const lat2 = toRad(b[1])
    const sinDlat = Math.sin(dLat / 2)
    const sinDlon = Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon), Math.sqrt(1 - (sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon)))
    return R * c
}

export async function computeAndDrawRoute(params: { graph: any, start: string, end: string, excludeStairs: boolean, mapRef: any, k?: number }) {
    const { graph, start, end, excludeStairs, mapRef, k = 3 } = params
    if (!graph) return null
    const exclude = excludeStairs ? ['stairs'] : []
    const ks = kShortestPaths({ nodes: graph.nodes, edges: graph.edges }, String(start), String(end), k, exclude)
    if (!ks || ks.length === 0) return null
    // Build per-segment features: for each consecutive node pair, try to find an original edge (graph.edges)
    const nodeById = new Map<string, any>()
    for (const n of graph.nodes) nodeById.set(String(n.id), n)
    const map = (mapRef && mapRef.current && (mapRef.current.getMap ? mapRef.current.getMap() : (mapRef.current.map ? mapRef.current.map : mapRef.current)))
    if (!map) return { routes: ks }
    // make combinedCoords available for fitBounds
    const combinedCoords: number[][] = []
    try {
        // build feature collections per path and draw each as its own source/layer
        const allRoutes: Array<{ geo: any, cost: number, id: string }> = []
        const combinedCoords: number[][] = []
        for (let idx = 0; idx < ks.length; idx++) {
            const item = ks[idx]
            const ids = item.path as string[]
            const features: any[] = []
            const allCoords: number[][] = []
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
                        // normalize level properties: convert numeric strings to numbers so filters match
                        if (props.level != null && typeof props.level === 'string') {
                            const n = Number(props.level)
                            if (!Number.isNaN(n)) props.level = n
                        }
                        if (props.levels && Array.isArray(props.levels)) {
                            props.levels = props.levels.map((v: any) => {
                                if (typeof v === 'string') {
                                    const n = Number(v)
                                    return Number.isNaN(n) ? v : n
                                }
                                return v
                            })
                        }
                    }
                } else if (aNode && bNode) {
                    segCoords = [aNode.coord, bNode.coord]
                }
                if (segCoords && segCoords.length) {
                    features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: segCoords }, properties: props })
                    for (const c of segCoords) { allCoords.push(c); combinedCoords.push(c) }
                }
            }
            const gid = `route-planner-${idx}`
            allRoutes.push({ geo: { type: 'FeatureCollection', features }, cost: item.cost, id: gid })
            // compute metric distance for this route
            let dist = 0
            for (const f of features) {
                if (f.geometry && f.geometry.type === 'LineString') {
                    const coords = f.geometry.coordinates
                    for (let j = 1; j < coords.length; j++) dist += haversine(coords[j - 1] as [number, number], coords[j] as [number, number])
                }
            }
            // attach metadata
            allRoutes[allRoutes.length - 1].geo = allRoutes[allRoutes.length - 1].geo
            allRoutes[allRoutes.length - 1].cost = item.cost
            // store distance & time as properties in the returned structure below
            // add/update source
            try {
                if (map.getSource && map.getSource(gid)) map.getSource(gid).setData(allRoutes[allRoutes.length - 1].geo)
                else if (map.addSource) map.addSource(gid, { type: 'geojson', data: allRoutes[allRoutes.length - 1].geo })
            } catch (e) { }
            // add/update layer with style varying by idx (0 = primary)
            const layerId = `${gid}-line`
            const color = idx === 0 ? '#ff0000' : (idx === 1 ? '#999999' : '#cccccc')
            const width = idx === 0 ? 18 : 12
            const opacity = idx === 0 ? 1 : 0.6
            try {
                if (!map.getLayer || !map.getLayer(layerId)) {
                    map.addLayer({ id: layerId, type: 'line', source: gid, paint: { 'line-color': color, 'line-width': width, 'line-opacity': opacity }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
                } else {
                    try { map.setPaintProperty(layerId, 'line-color', color); map.setPaintProperty(layerId, 'line-width', width); map.setPaintProperty(layerId, 'line-opacity', opacity) } catch (e) { }
                }
            } catch (e) { }
        }
        // ensure primary is on top
        try { if (map.moveLayer) map.moveLayer('route-planner-0-line') } catch (e) { }
    } catch (e) { }
    // ensure the map view shows the whole route
    try {
        if (combinedCoords && combinedCoords.length) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            for (const c of combinedCoords) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
            if (isFinite(minX)) map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 60, duration: 800 })
        }
    } catch (e) { }
    // build a richer routes result
    const routesOut: Array<any> = []
    for (let idx = 0; idx < ks.length; idx++) {
        const r = ks[idx]
        const gid = `route-planner-${idx}`
        // recompute distance similarly to above (could reuse but simpler to compute here)
        const featCollection = map.getSource && map.getSource(gid) ? (map.getSource(gid) as any)._data : null
        let dist = 0
        if (featCollection && featCollection.features) {
            for (const f of featCollection.features) {
                if (f.geometry && f.geometry.type === 'LineString') {
                    const coords = f.geometry.coordinates
                    for (let j = 1; j < coords.length; j++) dist += haversine(coords[j - 1] as [number, number], coords[j] as [number, number])
                }
            }
        }
        const speed = 1.4
        const timeSec = dist / speed
        routesOut.push({ id: gid, path: r.path, cost: r.cost, distance: dist, time: timeSec, layerId: `${gid}-line` })
    }
    return { routes: routesOut }
}
