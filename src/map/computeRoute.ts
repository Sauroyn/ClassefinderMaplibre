import { shortestPath } from './shortestPath'

export async function computeAndDrawRoute(params: { graph: any, start: string, end: string, excludeStairs: boolean, mapRef: any }) {
    const { graph, start, end, excludeStairs, mapRef } = params
    if (!graph) return null
    const exclude = excludeStairs ? ['stairs'] : []
    const p = shortestPath({ nodes: graph.nodes, edges: graph.edges }, String(start), String(end), exclude)
    if (!p) return null
    // Build per-segment features: for each consecutive node pair, try to find an original edge (graph.edges)
    const nodeById = new Map<string, any>()
    for (const n of graph.nodes) nodeById.set(String(n.id), n)
    const features: any[] = []
    const allCoords: number[][] = []
    const ids = p as string[]
    for (let i = 1; i < ids.length; i++) {
        const aId = String(ids[i - 1])
        const bId = String(ids[i])
        const aNode = nodeById.get(aId)
        const bNode = nodeById.get(bId)
        // try to find an edge connecting a->b or b->a
        let edge = graph.edges.find((e: any) => (String(e.from) === aId && String(e.to) === bId) || (String(e.from) === bId && String(e.to) === aId))
        let segCoords: number[][] = []
        const props: any = {}
        if (edge && edge.raw && edge.raw.geometry && edge.raw.geometry.type === 'LineString') {
            segCoords = edge.raw.geometry.coordinates.slice()
            // copy all original properties from the edge so attributes like `level` are preserved
            if (edge.raw.properties) {
                // shallow copy
                Object.assign(props, edge.raw.properties)
                // coerce level to number when appropriate
                if (props.level != null && typeof props.level === 'string') {
                    const n = Number(props.level)
                    props.level = Number.isFinite(n) ? n : props.level
                }
                // coerce levels array elements to numbers when possible
                if (Array.isArray(props.levels)) {
                    props.levels = props.levels.map((lv: any) => {
                        if (typeof lv === 'string') { const nn = Number(lv); return Number.isFinite(nn) ? nn : lv }
                        return lv
                    })
                }
                // if edge has no level info, try to infer from node-levels
                if (props.level == null && props.levels == null) {
                    const la = aNode?.raw?.properties?.level
                    const lb = bNode?.raw?.properties?.level
                    if (la != null && la === lb) props.level = la
                    else if (la != null || lb != null) props.levels = Array.from(new Set([la, lb].filter(x => x != null)))
                }
            }
        } else if (aNode && bNode) {
            // fallback: straight line between nodes
            segCoords = [aNode.coord, bNode.coord]
            // attempt to pick level from nodes if present
            const la = aNode.raw?.properties?.level
            const lb = bNode.raw?.properties?.level
            if (la != null && la === lb) props.level = la
            else if (la != null || lb != null) props.levels = Array.from(new Set([la, lb].filter(x => x != null)))
        }
        if (segCoords && segCoords.length) {
            features.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: segCoords }, properties: props })
            for (const c of segCoords) allCoords.push(c)
        }
    }
    const geo = { type: 'FeatureCollection', features }
    const map = (mapRef && mapRef.current && (mapRef.current.getMap ? mapRef.current.getMap() : (mapRef.current.map ? mapRef.current.map : mapRef.current)))
    if (!map) return { geo, path: p }
    try {
        // debug logs to inspect produced features and their properties
        try { console.log('[computeRoute] path', p) } catch (e) { }
        try { console.log('[computeRoute] geo', geo) } catch (e) { }
        try { for (let i = 0; i < geo.features.length; i++) console.log('[computeRoute] feature', i, geo.features[i].properties) } catch (e) { }
        if (map.getSource && map.getSource('route-planner')) map.getSource('route-planner').setData(geo)
        else {
            if (map.addSource) map.addSource('route-planner', { type: 'geojson', data: geo })
            if (map.addLayer) map.addLayer({ id: 'route-planner-line', type: 'line', source: 'route-planner', paint: { 'line-color': '#ff0000', 'line-width': 18 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
        }
        try { if (map.setPaintProperty) { map.setPaintProperty('route-planner-line', 'line-color', '#ff0000'); map.setPaintProperty('route-planner-line', 'line-width', 18) } } catch (e) { }
    } catch (e) { }
    // ensure the map view shows the whole route
    try {
        if (allCoords && allCoords.length) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            for (const c of allCoords) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
            if (isFinite(minX)) map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 60, duration: 800 })
        }
    } catch (e) { }
    return { geo, path: p }
}
