import { haversine } from './measure'
import { preparePaths } from './route/prepare'
import { buildFeatureCollections, drawRoutes } from './route/draw'
import { drawUserConnector, placeMarkers } from './route/markers'
import { fitToCombined } from './route/viewport'

export async function computeAndDrawRoute(params: { graph: any, start: string, end: string, excludeStairs: boolean, coveredOnly?: boolean, mapRef: any, k?: number, draw?: boolean, userOriginLngLat?: [number, number] }) {
    const { graph, start, end, excludeStairs, coveredOnly = false, mapRef, k = 3, draw = true, userOriginLngLat } = params
    if (!graph) return null
    // Si userOriginLngLat est fourni, on force le calcul à partir du nœud le plus proche, mais on ajoute TOUJOURS le segment user->graphe
    let realStart = start
    if (userOriginLngLat) {
        // Cherche le nœud du graphe le plus proche AU NIVEAU 1
        const isLevel1 = (n: any) => {
            try {
                if (n.level !== undefined && n.level !== null) return String(n.level) === '1'
                if (Array.isArray(n.levels)) return n.levels.map((x: any) => String(x)).includes('1')
                const p = (n.raw && n.raw.properties) ? n.raw.properties : {}
                if (p.level !== undefined && p.level !== null) return String(p.level) === '1'
                if (Array.isArray(p.levels)) return p.levels.map((x: any) => String(x)).includes('1')
            } catch { }
            return false
        }
        let bestId: string | null = null
        let bestD = Infinity
        for (const n of graph.nodes) {
            if (!isLevel1(n)) continue
            const d = haversine(userOriginLngLat, n.coord as [number, number])
            if (d < bestD) { bestD = d; bestId = String(n.id) }
        }
        // fallback si aucun nœud niveau 1 n'existe
        if (!bestId) {
            let fallbackBest: string | null = null
            let fallbackD = Infinity
            for (const n of graph.nodes) {
                const d = haversine(userOriginLngLat, n.coord as [number, number])
                if (d < fallbackD) { fallbackD = d; fallbackBest = String(n.id) }
            }
            bestId = fallbackBest
        }
        if (bestId) realStart = bestId
    }
    const ks = preparePaths(graph, String(realStart), String(end), { excludeStairs, coveredOnly, k })
    if (!ks || ks.length === 0) return null
    const map = (mapRef && mapRef.current && (mapRef.current.getMap ? mapRef.current.getMap() : (mapRef.current.map ? mapRef.current.map : mapRef.current)))
    const nodeById = new Map<string, any>(graph.nodes.map((n: any) => [String(n.id), n]))
    // Correction : toujours inclure le segment utilisateur->graphe dans la distance/temps/étapes
    function addUserConnectorIfNeeded(routeObj: any, userOriginLngLat?: [number, number]) {
        if (!userOriginLngLat) return
        const startNodeId = String(routeObj.path[0])
        const startNode = nodeById.get(startNodeId)
        if (!startNode || !Array.isArray(startNode.coord)) return
        // calcul distance
        const d = haversine(userOriginLngLat, startNode.coord as [number, number])
        // Ajoute TOUJOURS le segment user->graphe (même si très proche)
        routeObj.distance += d
        routeObj.time += d / 1.4
        routeObj.steps = [
            { fromId: 'user', toId: startNodeId, distance: d, coords: [userOriginLngLat, startNode.coord], level: 1 },
            ...(routeObj.steps || [])
        ]
    }
    if (!map || !draw) {
        const routesOut: Array<any> = []
        for (let idx = 0; idx < ks.length; idx++) {
            const r = ks[idx]
            const ids = r.path as string[]
            let dist = 0
            const steps: any[] = []
            for (let i = 1; i < ids.length; i++) {
                const a = nodeById.get(String(ids[i - 1]))
                const b = nodeById.get(String(ids[i]))
                if (a && b) {
                    const d = haversine(a.coord as [number, number], b.coord as [number, number])
                    dist += d
                    steps.push({ fromId: String(ids[i - 1]), toId: String(ids[i]), distance: d, coords: [a.coord, b.coord] })
                }
            }
            const speed = 1.4
            const timeSec = dist / speed
            const gid = `route-planner-${idx}`
            const routeObj = { id: gid, path: r.path, cost: r.cost, distance: dist, time: timeSec, layerId: `${gid}-line`, steps }
            addUserConnectorIfNeeded(routeObj, userOriginLngLat)
            routesOut.push(routeObj)
        }
        return { routes: routesOut }
    }
    // draw mode : la logique existante appelle déjà drawUserConnector qui affiche le segment
    const combinedCoords: number[][] = []
    const built = buildFeatureCollections(graph, ks, !!coveredOnly, combinedCoords)
    drawRoutes(map, built)
    drawUserConnector(map, graph, ks, userOriginLngLat, new Map(graph.nodes.map((n: any) => [String(n.id), n])), combinedCoords)
    placeMarkers(map, graph, String(realStart), String(end), ks, userOriginLngLat)
    fitToCombined(map, combinedCoords)
    const routesOut: Array<any> = []
    for (let idx = 0; idx < ks.length; idx++) {
        const r = ks[idx]
        const gid = `route-planner-${idx}`
        const featCollection = map.getSource && map.getSource(gid) ? (map.getSource(gid) as any)._data : null
        let dist = 0
        const steps: any[] = []
        if (featCollection && featCollection.features) {
            for (const f of featCollection.features) {
                if (f.geometry && f.geometry.type === 'LineString') {
                    const coords = f.geometry.coordinates
                    for (let j = 1; j < coords.length; j++) {
                        const d = haversine(coords[j - 1] as [number, number], coords[j] as [number, number])
                        dist += d
                        steps.push({ distance: d, coords: [coords[j - 1], coords[j]] })
                    }
                }
            }
        }
        // Ajoute le segment utilisateur->graphe dans le calcul temps/distance même en draw=true
        if (userOriginLngLat) {
            try {
                const startNodeId = String(r.path[0])
                const startNode = nodeById.get(startNodeId)
                if (startNode && Array.isArray(startNode.coord)) {
                    const d0 = haversine(userOriginLngLat, startNode.coord as [number, number])
                    dist += d0
                    steps.unshift({ distance: d0, coords: [userOriginLngLat, startNode.coord], level: 1 })
                }
            } catch { }
        }
        const speed = 1.4
        const timeSec = dist / speed
        routesOut.push({ id: gid, path: r.path, cost: r.cost, distance: dist, time: timeSec, layerId: `${gid}-line`, steps })
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
