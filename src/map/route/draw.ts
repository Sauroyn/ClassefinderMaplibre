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
    // Réinitialiser le cache d'ordre quand on dessine de nouvelles routes
    _cachedOrdering = null
    _cachedRouteId = null

    for (let idx = 0; idx < routes.length; idx++) {
        const { id, geo } = routes[idx]

        // Toujours créer la source originale
        try {
            if (map.getSource && map.getSource(id)) (map.getSource(id) as any).setData(geo)
            else if (map.addSource) map.addSource(id, { type: 'geojson', data: geo })
        } catch { }

        // Pour la route principale (idx === 0), on crée 2 sources séparées :
        // - parcourue (bleu) pendant la navigation
        // - restante (rouge par défaut avant navigation, puis gris dès que la navigation progresse)
        if (idx === 0) {
            // Source pour la partie parcourue (BLEU en navigation)
            const coveredId = `${id}-covered`
            const coveredLayerId = `${coveredId}-line`
            try {
                if (!map.getSource(coveredId)) {
                    map.addSource(coveredId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
                }
                if (!map.getLayer(coveredLayerId)) {
                    map.addLayer({
                        id: coveredLayerId,
                        type: 'line',
                        source: coveredId,
                        paint: { 'line-color': '#007bff', 'line-width': 18, 'line-opacity': 1 },
                        layout: { 'line-cap': 'round', 'line-join': 'round' }
                    })
                }
            } catch { }

            // Source pour la partie restante (ROUGE avant nav, passera en GRIS à la première progression)
            const remainingId = `${id}-remaining`
            const remainingLayerId = `${remainingId}-line`
            try {
                if (!map.getSource(remainingId)) {
                    map.addSource(remainingId, { type: 'geojson', data: geo })
                }
                if (!map.getLayer(remainingLayerId)) {
                    map.addLayer({
                        id: remainingLayerId,
                        type: 'line',
                        source: remainingId,
                        // Avant navigation: ROUTE en ROUGE (trajet le plus court)
                        paint: { 'line-color': '#e53935', 'line-width': 18, 'line-opacity': 1 },
                        layout: { 'line-cap': 'round', 'line-join': 'round' }
                    })
                }
                // Appliquer le filtre d'étage si disponible pour restaurer la visibilité par niveau
                try {
                    const levelNow = (map as any).__currentLevel
                    if (levelNow != null) {
                        const routeFilter: any = ['any',
                            ['==', ['get', 'level'], levelNow],
                            ['all', ['has', 'levels'], ['in', levelNow, ['get', 'levels']]],
                            // Fallback: si une feature n'a pas de niveau, on l'affiche quel que soit l'étage
                            ['all', ['!', ['has', 'level']], ['!', ['has', 'levels']]]
                        ]
                        try { map.setFilter(coveredLayerId, routeFilter) } catch { }
                        try { map.setFilter(remainingLayerId, routeFilter) } catch { }
                    }
                } catch { }
            } catch { }
        } else {
            // Routes alternatives (idx > 0) : affichage normal
            const layerId = `${id}-line`
            const color = idx === 1 ? '#999999' : '#cccccc'
            const width = 12
            const opacity = 0.6
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
    }

    try {
        // Ordre des couches : restante en dessous, parcourue au-dessus
        if (map.moveLayer) {
            map.moveLayer('route-planner-0-remaining-line')
            map.moveLayer('route-planner-0-covered-line')
        }
    } catch { }

    // Cacher le connecteur séparé s'il existe (on affiche désormais la version combinée)
    try {
        if (map.getLayer && map.getLayer('route-planner-user-connector-line')) {
            map.setLayoutProperty('route-planner-user-connector-line', 'visibility', 'none')
        }
    } catch { }
}

// Mémorisation du sens global pour éviter les inversions en cours de navigation
let _cachedOrdering: Array<{ coords: number[][], props: any }> | null = null
let _cachedRouteId: string | null = null

// Fonction pour mettre à jour la progression : divise l'itinéraire en partie parcourue (bleu) et restante (gris)
export function updateRouteProgress(map: any, routeSourceId: string, alongDistance: number, userLngLat?: [number, number], stepsPolyline?: number[][]) {
    try {
        const rtSrc: any = map.getSource && map.getSource(routeSourceId)
        if (!rtSrc || !rtSrc._data || !rtSrc._data.features) return
        // 1) Construire une CHAÎNE UNIQUE: [connecteur] + [segments d'itinéraire] dans l'ORDRE DE LA ROUTE,
        //    en inversant l'orientation segment par segment uniquement pour assurer la continuité.
        const routeFeatures = (rtSrc._data.features as any[]).filter(f => f?.geometry?.type === 'LineString')
        const getEnds = (coords: number[][]) => [coords[0], coords[coords.length - 1]] as [number[], number[]]
        const distance = (a: number[], b: number[]) => haversine(a as any, b as any)

        // Connexion utilisateur -> graphe (si présente)
        let connectorCoords: number[][] | null = null
        try {
            const connSrc: any = map.getSource && map.getSource('route-planner-user-connector')
            const connF = connSrc && connSrc._data && connSrc._data.features && connSrc._data.features[0]
            if (connF && connF.geometry && connF.geometry.type === 'LineString') {
                const cc = (connF.geometry.coordinates as number[][]).slice()
                if (cc.length >= 2) connectorCoords = cc
            }
        } catch { }

        // Utiliser le cache si disponible pour ce routeId, sinon calculer et mémoriser
        let ordered: Array<{ coords: number[][], props: any }> = []
        if (_cachedRouteId === routeSourceId && _cachedOrdering) {
            // Réutiliser l'ordre mémorisé (y compris le connecteur)
            ordered = _cachedOrdering.map(seg => ({ coords: seg.coords.slice(), props: { ...seg.props } }))
        } else {
            // Premier passage: calculer l'ordre global et le mémoriser
            let curEnd: number[] | null = null
            if (connectorCoords) {
                ordered.push({ coords: connectorCoords, props: { level: 1, __isConnector: true } })
                curEnd = connectorCoords[connectorCoords.length - 1]
            }
            // 1) Ordonner les segments selon leur position le long des steps (départ -> arrivée)
            let segments = routeFeatures.map(f => ({ coords: (f.geometry.coordinates as number[][]).slice(), props: (f.properties || {}) }))
            if (segments.length) {
                if (stepsPolyline && stepsPolyline.length >= 2) {
                    // Helper local pour projeter un point sur une polyline et obtenir l'along
                    const projectOnPolylineLocal = (pt: [number, number], coords: number[][]) => {
                        let bestDist = Infinity
                        let bestAlong = 0
                        let total = 0
                        let run = 0
                        const toMeters = (a: [number, number], b: [number, number]) => haversine(a, b)
                        const projectOnSeg = (pt2: [number, number], a: [number, number], b: [number, number]) => {
                            const lat0 = (a[1] + b[1]) * 0.5 * Math.PI / 180
                            const kx = Math.cos(lat0) * 111320
                            const ky = 110540
                            const ax = a[0] * kx, ay = a[1] * ky
                            const bx = b[0] * kx, by = b[1] * ky
                            const px = pt2[0] * kx, py = pt2[1] * ky
                            const vx = bx - ax, vy = by - ay
                            const wx = px - ax, wy = py - ay
                            const vv = vx * vx + vy * vy
                            const t = vv > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * wy) / vv)) : 0
                            const sx = ax + vx * t, sy = ay + vy * t
                            const spt: [number, number] = [sx / kx, sy / ky]
                            const d = toMeters(pt2, spt)
                            return { t, d }
                        }
                        for (let i = 1; i < coords.length; i++) {
                            const a = coords[i - 1] as [number, number]
                            const b = coords[i] as [number, number]
                            const segLen = toMeters(a, b)
                            total += segLen
                            const { t, d } = projectOnSeg(pt, a, b)
                            if (d < bestDist) {
                                bestDist = d
                                bestAlong = run + segLen * t
                            }
                            run += segLen
                        }
                        return { dist: bestDist, along: bestAlong, total }
                    }
                    // Assigner un paramètre s (along) à chaque segment via son point milieu
                    const segWithS = segments.map(seg => {
                        const cs = seg.coords
                        const mid = cs[Math.floor(cs.length / 2)] as [number, number]
                        const pj = projectOnPolylineLocal(mid, stepsPolyline)
                        return { ...seg, _s: pj.along }
                    })
                    segWithS.sort((a, b) => a._s - b._s)
                    segments = segWithS.map(({ _s, ...rest }) => rest)
                }
                // Orienter le 1er segment pour qu'il démarre côté stepsStart, puis assurer la continuité
                let prevEnd: number[] | null = null
                if (segments.length) {
                    let c0 = segments[0].coords
                    if (stepsPolyline && stepsPolyline.length >= 2) {
                        const stepsStart = stepsPolyline[0] as [number, number]
                        const [s0, e0] = getEnds(c0)
                        const dS0 = distance(stepsStart, s0)
                        const dE0 = distance(stepsStart, e0)
                        if (dE0 < dS0) c0 = c0.slice().reverse()
                    }
                    segments[0].coords = c0
                    prevEnd = c0[c0.length - 1]
                }
                for (let i = 1; i < segments.length; i++) {
                    let coords = segments[i].coords
                    const [s, e] = getEnds(coords)
                    const dS = distance(prevEnd as number[], s)
                    const dE = distance(prevEnd as number[], e)
                    if (dE < dS) coords = coords.slice().reverse()
                    segments[i].coords = coords
                    prevEnd = coords[coords.length - 1]
                }
            }
            // 3) Empiler le connecteur (déjà orienté utilisateur->graphe), puis les segments, en garantissant la continuité locale
            for (const seg of segments) {
                let coords = seg.coords.slice()
                if (curEnd) {
                    const [s, e] = getEnds(coords)
                    const dS = distance(curEnd, s)
                    const dE = distance(curEnd, e)
                    if (dE < dS) coords = coords.slice().reverse()
                }
                ordered.push({ coords, props: seg.props })
                curEnd = coords[coords.length - 1]
            }
            // Mémoriser l'ordre calculé pour ce routeId
            _cachedOrdering = ordered.map(seg => ({ coords: seg.coords.slice(), props: { ...seg.props } }))
            _cachedRouteId = routeSourceId
        }

        // 2) Calcul de la progression GLOBALE (connecteur inclus) et découpe UNE SEULE FOIS
        const coveredFeatures: any[] = []
        const remainingFeatures: any[] = []

        // Longueur totale de la chaîne ordonnée (connecteur + segments)
        let totalLen = 0
        for (const seg of ordered) {
            const coords = seg.coords
            for (let i = 1; i < coords.length; i++) totalLen += haversine(coords[i - 1] as any, coords[i] as any)
        }

        // Helpers: project a point onto a polyline and return distance to polyline, along-distance to projection, and total length
        const projectOnPolyline = (pt: [number, number], coords: number[][]) => {
            let bestDist = Infinity
            let bestAlong = 0
            let totalLen = 0
            let alongRun = 0
            const toMeters = (a: [number, number], b: [number, number]) => haversine(a, b)
            const projectOnSeg = (p: [number, number], a: [number, number], b: [number, number]) => {
                // equirectangular approx in local frame
                const lat0 = (a[1] + b[1]) * 0.5 * Math.PI / 180
                const kx = Math.cos(lat0) * 111320
                const ky = 110540
                const ax = a[0] * kx, ay = a[1] * ky
                const bx = b[0] * kx, by = b[1] * ky
                const px = p[0] * kx, py = p[1] * ky
                const vx = bx - ax, vy = by - ay
                const wx = px - ax, wy = py - ay
                const vv = vx * vx + vy * vy
                const t = vv > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / vv)) : 0
                const sx = ax + vx * t, sy = ay + vy * t
                const spt: [number, number] = [sx / kx, sy / ky]
                const d = toMeters(p, spt)
                return { t, d, spt }
            }
            for (let i = 1; i < coords.length; i++) {
                const a = coords[i - 1] as [number, number]
                const b = coords[i] as [number, number]
                const segLen = toMeters(a, b)
                totalLen += segLen
                const { t, d } = projectOnSeg(pt, a, b)
                if (d < bestDist) {
                    bestDist = d
                    bestAlong = alongRun + segLen * t
                }
                alongRun += segLen
            }
            return { dist: bestDist, along: bestAlong, total: totalLen }
        }

        // Longueur cumulée du connecteur (utile pour fallback)
        let connectorLength = 0
        if (connectorCoords) {
            for (let i = 1; i < connectorCoords.length; i++) connectorLength += haversine(connectorCoords[i - 1] as any, connectorCoords[i] as any)
        }

        // Calculer la progression en projetant l'utilisateur sur la CHAÎNE COMPLÈTE (connecteur + route)
        let progress = 0
        if (userLngLat) {
            const chainCoords: number[][] = []
            for (const seg of ordered) {
                if (!seg.coords || seg.coords.length < 2) continue
                if (chainCoords.length === 0) chainCoords.push(seg.coords[0])
                for (let i = 1; i < seg.coords.length; i++) chainCoords.push(seg.coords[i])
            }
            if (chainCoords.length >= 2) {
                const pjAll = projectOnPolyline(userLngLat, chainCoords)
                progress = Math.max(0, pjAll.along)
            } else {
                // Fallback, très rare: pas de chaîne exploitable
                progress = Math.max(0, (alongDistance || 0))
            }
        } else {
            // Fallback: approx via alongDistance; ajouter la longueur du connecteur si présent
            progress = Math.max(0, (alongDistance || 0) + (connectorLength || 0))
        }

        // Borner la progression pour éviter de recouvrir tout le trajet à cause d'arrondis
        if (isFinite(totalLen)) progress = Math.max(0, Math.min(progress, totalLen))

        let cum = 0
        let cutDone = false
        for (const seg of ordered) {
            const coords = seg.coords
            let segLen = 0
            for (let i = 1; i < coords.length; i++) segLen += haversine(coords[i - 1] as any, coords[i] as any)
            if (cutDone) {
                if (coords.length >= 2) remainingFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords.slice() }, properties: seg.props })
                continue
            }
            if (cum + segLen <= progress - 1e-6) {
                if (coords.length >= 2) coveredFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords.slice() }, properties: seg.props })
                cum += segLen
                continue
            }
            // coupe à l'intérieur de ce segment
            let run = 0
            let cutIdx = -1
            let cutT = 0
            for (let i = 1; i < coords.length; i++) {
                const a = coords[i - 1]
                const b = coords[i]
                const d = haversine(a as any, b as any)
                if (run + d >= (progress - cum)) {
                    cutIdx = i - 1
                    const remain = (progress - cum) - run
                    cutT = d > 0 ? Math.max(0, Math.min(1, remain / d)) : 0
                    break
                }
                run += d
            }
            if (cutIdx === -1) {
                // bord: pile à la fin
                if (coords.length >= 2) coveredFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords.slice() }, properties: seg.props })
                cutDone = true
            } else {
                const a = coords[cutIdx]
                const b = coords[cutIdx + 1]
                const cutPoint: [number, number] = [
                    a[0] + (b[0] - a[0]) * cutT,
                    a[1] + (b[1] - a[1]) * cutT
                ]
                const covCoords: number[][] = coords.slice(0, cutIdx + 1)
                const lastC = covCoords[covCoords.length - 1]
                if (!lastC || lastC[0] !== cutPoint[0] || lastC[1] !== cutPoint[1]) covCoords.push(cutPoint)
                const remCoords: number[][] = [cutPoint, ...coords.slice(cutIdx + 1)]
                if (covCoords.length >= 2) coveredFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: covCoords }, properties: seg.props })
                if (remCoords.length >= 2) remainingFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: remCoords }, properties: seg.props })
                cutDone = true
            }
        }

        // 3) Mettre à jour les sources
        // Dès que la progression démarre, basculer la couleur de la partie restante en GRIS
        try {
            const remainingLayerId = `${routeSourceId}-remaining-line`
            if ((coveredFeatures.length > 0) && map.getLayer && map.getLayer(remainingLayerId)) {
                map.setPaintProperty(remainingLayerId, 'line-color', '#9aa0a6')
            }
        } catch { }
        try {
            const coveredSource = map.getSource(`${routeSourceId}-covered`)
            if (coveredSource) coveredSource.setData({ type: 'FeatureCollection', features: coveredFeatures })
            const remainingSource = map.getSource(`${routeSourceId}-remaining`)
            if (remainingSource) remainingSource.setData({ type: 'FeatureCollection', features: remainingFeatures })
        } catch (e) {
            console.warn('Error updating route progress:', e)
        }

        // S'assurer que le connecteur dédié est caché
        try { if (map.getLayer && map.getLayer('route-planner-user-connector-line')) map.setLayoutProperty('route-planner-user-connector-line', 'visibility', 'none') } catch { }
    } catch (e) {
        console.warn('Error in updateRouteProgress:', e)
    }
}