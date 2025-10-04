import { haversine } from './measure'
import { preparePaths } from './route/prepare'
import { buildFeatureCollections, drawRoutes } from './route/draw'
import { drawUserConnector, placeMarkers } from './route/markers'
import { fitToCombined } from './route/viewport'

export async function computeAndDrawRoute(params: { graph: any, start: string, end: string, excludeStairs: boolean, coveredOnly?: boolean, mapRef: any, k?: number, draw?: boolean, userOriginLngLat?: [number, number] }) {
    const { graph, start, end, excludeStairs, coveredOnly = false, mapRef, k = 3, draw = true, userOriginLngLat } = params
    if (!graph) return null
    const ks = preparePaths(graph, String(start), String(end), { excludeStairs, coveredOnly, k })
    const map = (mapRef && mapRef.current && (mapRef.current.getMap ? mapRef.current.getMap() : (mapRef.current.map ? mapRef.current.map : mapRef.current)))
    if (!ks || ks.length === 0) {
        // Fallback: if drawing on map and we have a user origin, draw a straight connector to nearest graph node
        if (map && draw && userOriginLngLat) {
            const nodeById = new Map<string, any>(graph.nodes.map((n: any) => [String(n.id), n]))
            const combinedCoords: number[][] = []
            try {
                drawUserConnector(map, graph, [], userOriginLngLat, nodeById, combinedCoords)
                placeMarkers(map, graph, String(start), String(end), [], userOriginLngLat)
                if (combinedCoords.length === 0) combinedCoords.push(userOriginLngLat)
                fitToCombined(map, combinedCoords)
            } catch { /* ignore */ }
            return { routes: [] }
        }
        return null
    }
    if (!map || !draw) {
        const nodeById = new Map<string, any>(graph.nodes.map((n: any) => [String(n.id), n]))
        const routesOut: Array<any> = []
        for (let idx = 0; idx < ks.length; idx++) {
            const r = ks[idx]
            const ids = r.path as string[]
            let dist = 0
            for (let i = 1; i < ids.length; i++) {
                const a = nodeById.get(String(ids[i - 1]))
                const b = nodeById.get(String(ids[i]))
                if (a && b) dist += haversine(a.coord as [number, number], b.coord as [number, number])
            }
            // Add connector distance if user origin is provided (approx: to first node)
            if (userOriginLngLat && ids.length > 0) {
                const first = nodeById.get(String(ids[0]))
                if (first && first.coord) dist += haversine(userOriginLngLat, first.coord as [number, number])
            }
            const speed = 1.4
            const timeSec = dist / speed
            const gid = `route-planner-${idx}`
            routesOut.push({ id: gid, path: r.path, cost: r.cost, distance: dist, time: timeSec, layerId: `${gid}-line` })
        }
        return { routes: routesOut }
    }
    const combinedCoords: number[][] = []
    const built = buildFeatureCollections(graph, ks, !!coveredOnly, combinedCoords)
    drawRoutes(map, built)
    drawUserConnector(map, graph, ks, userOriginLngLat, new Map(graph.nodes.map((n: any) => [String(n.id), n])), combinedCoords)
    placeMarkers(map, graph, String(start), String(end), ks, userOriginLngLat)
    fitToCombined(map, combinedCoords)
    const routesOut: Array<any> = []
    for (let idx = 0; idx < ks.length; idx++) {
        const r = ks[idx]
        const gid = `route-planner-${idx}`
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
        // Add connector distance from its source if available
        try {
            if (userOriginLngLat) {
                const connSrc: any = map.getSource && map.getSource('route-planner-user-connector')
                const data = connSrc && connSrc._data
                if (data && data.features && data.features[0] && data.features[0].geometry && data.features[0].geometry.type === 'LineString') {
                    const cc = data.features[0].geometry.coordinates
                    for (let j = 1; j < cc.length; j++) dist += haversine(cc[j - 1] as [number, number], cc[j] as [number, number])
                }
            }
        } catch { /* ignore */ }
        const speed = 1.4
        const timeSec = dist / speed
        routesOut.push({ id: gid, path: r.path, cost: r.cost, distance: dist, time: timeSec, layerId: `${gid}-line` })
    }
    return { routes: routesOut }
}

export async function computeRouteTime(params: { graph: any, start: string, end: string, excludeStairs?: boolean, coveredOnly?: boolean, mapRef?: any }): Promise<{ seconds: number, distance: number } | null> {
    const { graph, start, end, excludeStairs = false, coveredOnly = false, mapRef } = params
    const res = await computeAndDrawRoute({ graph, start, end, excludeStairs, coveredOnly, mapRef: mapRef ?? { current: null }, k: 1, draw: false })
    if (!res || !res.routes || !res.routes.length) return null
    const r0 = res.routes[0]
    return { seconds: r0.time, distance: r0.distance }
}
