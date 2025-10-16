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
    // --- Maneuver helpers ---
    // Thresholds (tuned higher to reduce step/manoeuvre noise)
    const SMALL_SEG_IGNORE_METERS = 2       // was 2
    const STRAIGHT_ANGLE_TOL_DEG = 50     // was 80 (consider as straight if change <= this)
    const ARC_THRESHOLD_DEG = 35            // was 35 (for roundabout-like arcs)
    const SLIGHT_TURN_MIN_DEG = 20        // effective only when > straight tol; keep just above straight tol
    const NORMAL_TURN_MIN_DEG = 80         // was 90
    function bearingDegrees(a: [number, number], b: [number, number]) {
        const toRad = (d: number) => d * Math.PI / 180
        const toDeg = (r: number) => r * 180 / Math.PI
        const φ1 = toRad(a[1]), φ2 = toRad(b[1])
        const Δλ = toRad(b[0] - a[0])
        const y = Math.sin(Δλ) * Math.cos(φ2)
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
        return (toDeg(Math.atan2(y, x)) + 360) % 360
    }
    function normalizeDelta(d: number) { return ((d + 540) % 360) - 180 }

    // Fusionne les segments consécutifs considérés comme "tout droit" (et sur le même niveau) en une seule étape
    function coalesceSteps(rawSteps: Array<any>): Array<any> {
        if (!Array.isArray(rawSteps) || rawSteps.length === 0) return []
        const out: any[] = []
        let cur: any | null = null
        let lastBearing: number | null = null
        const pushCur = () => { if (cur) { out.push(cur); cur = null; lastBearing = null } }
        for (let i = 0; i < rawSteps.length; i++) {
            const s = rawSteps[i]
            // Étapes de changement d'étage: ne pas fusionner; couper le groupe
            if (s && s.type === 'floor-change') { pushCur(); out.push(s); continue }
            const d = Number(s?.distance || 0)
            if (!s || !s.coords || s.coords.length !== 2 || !Number.isFinite(d)) { pushCur(); continue }
            const a = s.coords[0] as [number, number]
            const b = s.coords[1] as [number, number]
            const lvl = s.level
            const br = bearingDegrees(a, b)
            if (!cur) {
                const minX = Math.min(a[0], b[0])
                const minY = Math.min(a[1], b[1])
                const maxX = Math.max(a[0], b[0])
                const maxY = Math.max(a[1], b[1])
                cur = { distance: d, coords: [a, b], level: lvl, bbox: [[minX, minY], [maxX, maxY]] as [[number, number], [number, number]] }
                lastBearing = br
            } else {
                // Niveau identique requis pour fusionner
                const sameLevel = (cur.level ?? null) === (lvl ?? null)
                const delta = lastBearing == null ? 0 : normalizeDelta(br - (lastBearing as number))
                const abs = Math.abs(delta)
                if (sameLevel && abs <= STRAIGHT_ANGLE_TOL_DEG) {
                    // Fusion: prolonger l'étape courante jusqu'à b
                    cur.distance = (Number(cur.distance) || 0) + d
                    cur.coords = [cur.coords[0], b]
                    // Élargir la bbox
                    try {
                        const bb = cur.bbox as [[number, number], [number, number]]
                        const minX = Math.min(bb[0][0], a[0], b[0])
                        const minY = Math.min(bb[0][1], a[1], b[1])
                        const maxX = Math.max(bb[1][0], a[0], b[0])
                        const maxY = Math.max(bb[1][1], a[1], b[1])
                        cur.bbox = [[minX, minY], [maxX, maxY]] as [[number, number], [number, number]]
                    } catch { }
                    lastBearing = br
                } else {
                    pushCur()
                    const minX = Math.min(a[0], b[0])
                    const minY = Math.min(a[1], b[1])
                    const maxX = Math.max(a[0], b[0])
                    const maxY = Math.max(a[1], b[1])
                    cur = { distance: d, coords: [a, b], level: lvl, bbox: [[minX, minY], [maxX, maxY]] as [[number, number], [number, number]] }
                    lastBearing = br
                }
            }
        }
        pushCur()
        return out
    }
    type Maneuver = { at: number, type: string, idx?: number }
    function buildManeuvers(steps: Array<any>): Maneuver[] {
        const mans: Maneuver[] = []
        if (!Array.isArray(steps) || steps.length === 0) return mans
        let cum = 0
        let lastSegBearing: number | null = null
        let lastSegIdx: number | null = null
        const nextSegIndexFrom = (from: number) => {
            for (let j = from + 1; j < steps.length; j++) if (steps[j] && steps[j].coords) return j
            return -1
        }
        // Pour la détection de rond-point
        let arcStartIdx: number | null = null
        let arcDir: number | null = null
        let arcCount = 0
        let arcFirstCum = 0
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i]
            // Changement d'étage explicite
            if (s && s.type === 'floor-change') {
                const idx = nextSegIndexFrom(i - 1)
                mans.push({ at: cum, type: s.direction === 'up' ? 'floor-up' : 'floor-down', idx: idx >= 0 ? idx : undefined })
                cum += Number(s?.distance || 0)
                // On ne saute pas le cum += d plus bas car distance=0
                continue
            }
            const d = Number(s?.distance || 0)
            // Ignore les très petits segments pour la détection de manœuvre
            if (d < SMALL_SEG_IGNORE_METERS) {
                cum += d
                continue
            }
            if (s && s.coords && Array.isArray(s.coords) && s.coords.length === 2) {
                const a = s.coords[0] as [number, number]
                const b = s.coords[1] as [number, number]
                const br = bearingDegrees(a, b)
                if (lastSegBearing != null && lastSegIdx != null) {
                    let delta = normalizeDelta(br - lastSegBearing)
                    let abs = Math.abs(delta)
                    // DEBUG : log toujours actif pour analyse
                    // eslint-disable-next-line no-console
                    console.info(`[ManeuverDebug] i=${i} delta=${delta.toFixed(2)} abs=${abs.toFixed(2)} br=${br.toFixed(2)} last=${lastSegBearing.toFixed(2)}`)
                    // 1. Tolérance "tout droit" : angle faible (<= STRAIGHT_ANGLE_TOL_DEG)
                    if (abs <= STRAIGHT_ANGLE_TOL_DEG) {
                        // Considérer comme tout droit, pas de manœuvre
                        // On ne fait rien
                    } else {
                        // 2. Détection d'arc de cercle (rond-point)
                        // Si plusieurs segments consécutifs tournent dans le même sens (delta > 35°), on compte
                        const arcThreshold = ARC_THRESHOLD_DEG
                        if (Math.abs(delta) > arcThreshold) {
                            const dir = delta > 0 ? 1 : -1
                            if (arcStartIdx === null) {
                                arcStartIdx = lastSegIdx
                                arcDir = dir
                                arcCount = 1
                                arcFirstCum = cum
                            } else if (arcDir === dir && arcCount < 6) {
                                arcCount++
                            } else {
                                // Changement de sens ou trop long : on termine l'arc
                                if (arcCount >= 3) {
                                    // On considère que c'est un rond-point
                                    mans.push({ at: arcFirstCum, type: arcDir === 1 ? 'roundabout-left' : 'roundabout-right', idx: arcStartIdx })
                                }
                                arcStartIdx = lastSegIdx
                                arcDir = dir
                                arcCount = 1
                                arcFirstCum = cum
                            }
                        } else {
                            // Si on sort d'un arc, on le termine
                            if (arcCount >= 3) {
                                mans.push({ at: arcFirstCum, type: arcDir === 1 ? 'roundabout-left' : 'roundabout-right', idx: arcStartIdx ?? undefined })
                            }
                            arcStartIdx = null
                            arcDir = null
                            arcCount = 0
                        }
                        // 3. Virages classiques
                        let typ: string | null = null
                        if (abs >= NORMAL_TURN_MIN_DEG) typ = (delta > 0 ? 'turn-left' : 'turn-right')
                        else if (abs >= SLIGHT_TURN_MIN_DEG) typ = (delta > 0 ? 'turn-slight-left' : 'turn-slight-right')
                        if (typ) {
                            mans.push({ at: cum, type: typ, idx: lastSegIdx })
                        }
                    }
                }
                lastSegBearing = br
                lastSegIdx = i
            }
            cum += d
        }
        // Si on termine sur un arc, on le clôture
        if (arcCount >= 3) {
            mans.push({ at: arcFirstCum, type: arcDir === 1 ? 'roundabout-left' : 'roundabout-right', idx: arcStartIdx ?? undefined })
        }
        // Arrivée
        mans.push({ at: cum, type: 'arrive', idx: steps.length - 1 })
        return mans
    }
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
            { fromId: 'user', toId: startNodeId, distance: d, coords: [userOriginLngLat, startNode.coord], level: 0 },
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
            let prevLevel: number | null = null
            for (let i = 1; i < ids.length; i++) {
                const a = nodeById.get(String(ids[i - 1]))
                const b = nodeById.get(String(ids[i]))
                if (a && b) {
                    const d = haversine(a.coord as [number, number], b.coord as [number, number])
                    dist += d
                    // try to infer level for this segment
                    const lvlA = (a.level != null ? Number(a.level) : (Array.isArray(a.levels) && a.levels.length ? Number(a.levels[0]) : (a.raw?.properties?.level != null ? Number(a.raw.properties.level) : null)))
                    const lvlB = (b.level != null ? Number(b.level) : (Array.isArray(b.levels) && b.levels.length ? Number(b.levels[0]) : (b.raw?.properties?.level != null ? Number(b.raw.properties.level) : null)))
                    const segLevel = (lvlA != null && !Number.isNaN(lvlA)) ? lvlA : (lvlB != null && !Number.isNaN(lvlB) ? lvlB : null)
                    // add explicit floor change step if level changed from previous
                    if (prevLevel != null && segLevel != null && segLevel !== prevLevel) {
                        const dir = segLevel > prevLevel ? 'up' : 'down'
                        steps.push({ type: 'floor-change', direction: dir, fromLevel: prevLevel, toLevel: segLevel, level: segLevel, distance: 0 })
                    }
                    if (segLevel != null) prevLevel = segLevel
                    steps.push({ fromId: String(ids[i - 1]), toId: String(ids[i]), distance: d, coords: [a.coord, b.coord], level: segLevel ?? undefined })
                }
            }
            // Fusion des segments colinéaires avant calcul des manœuvres
            const mergedSteps = coalesceSteps(steps)
            const speed = 1.4
            const timeSec = dist / speed
            const gid = `route-planner-${idx}`
            const maneuvers = buildManeuvers(mergedSteps)
            const routeObj = { id: gid, path: r.path, cost: r.cost, distance: dist, time: timeSec, layerId: `${gid}-line`, steps: mergedSteps, maneuvers }
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
        let prevLevel: number | null = null
        if (featCollection && featCollection.features) {
            for (const f of featCollection.features) {
                if (f.geometry && f.geometry.type === 'LineString') {
                    const coords = f.geometry.coordinates
                    const segLevel = (f.properties && f.properties.level != null) ? (typeof f.properties.level === 'string' ? Number(f.properties.level) : f.properties.level) : null
                    // add explicit floor-change step if level changed
                    if (prevLevel != null && segLevel != null && segLevel !== prevLevel) {
                        const dir = segLevel > prevLevel ? 'up' : 'down'
                        steps.push({ type: 'floor-change', direction: dir, fromLevel: prevLevel, toLevel: segLevel, level: segLevel, distance: 0 })
                    }
                    if (segLevel != null) prevLevel = segLevel
                    for (let j = 1; j < coords.length; j++) {
                        const d = haversine(coords[j - 1] as [number, number], coords[j] as [number, number])
                        dist += d
                        const a = coords[j - 1] as [number, number]; const b = coords[j] as [number, number]
                        const minX = Math.min(a[0], b[0])
                        const minY = Math.min(a[1], b[1])
                        const maxX = Math.max(a[0], b[0])
                        const maxY = Math.max(a[1], b[1])
                        steps.push({ distance: d, coords: [a, b], level: segLevel ?? undefined, bbox: [[minX, minY], [maxX, maxY]] })
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
                    const a = userOriginLngLat as [number, number]; const b = startNode.coord as [number, number]
                    const minX = Math.min(a[0], b[0])
                    const minY = Math.min(a[1], b[1])
                    const maxX = Math.max(a[0], b[0])
                    const maxY = Math.max(a[1], b[1])
                    steps.unshift({ distance: d0, coords: [a, b], level: 0, bbox: [[minX, minY], [maxX, maxY]] })
                }
            } catch { }
        }
        // Fusion des segments colinéaires avant calcul des manœuvres
        const mergedSteps = coalesceSteps(steps)
        const speed = 1.4
        const timeSec = dist / speed
        const maneuvers = buildManeuvers(mergedSteps)
        routesOut.push({ id: gid, path: r.path, cost: r.cost, distance: dist, time: timeSec, layerId: `${gid}-line`, steps: mergedSteps, maneuvers })
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
