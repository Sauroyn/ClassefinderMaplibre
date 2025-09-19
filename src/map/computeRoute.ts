import { kShortestPaths } from './shortestPath'
import maplibre from 'maplibre-gl'
import { fitBoundsSmart } from './viewport'

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

export async function computeAndDrawRoute(params: { graph: any, start: string, end: string, excludeStairs: boolean, coveredOnly?: boolean, mapRef: any, k?: number }) {
    const { graph, start, end, excludeStairs, coveredOnly = false, mapRef, k = 3 } = params
    if (!graph) return null
    const exclude = excludeStairs ? ['stairs'] : []
    // optionally filter edges before pathfinding
    const filteredEdges = graph.edges.filter((e: any) => {
        // consider tags array first
        const tags: string[] = Array.isArray(e.tags) ? e.tags : (e.tags ? [e.tags] : [])
        // detect steps via tags or raw properties
        let isSteps = false
        if (tags.some(t => String(t).toLowerCase() === 'steps')) isSteps = true
        if (e.raw && e.raw.properties) {
            const hp = e.raw.properties['highway'] ?? e.raw.properties['type']
            if (hp && String(hp).toLowerCase() === 'steps') isSteps = true
        }
        if (excludeStairs && isSteps) return false
        // detect covered property
        let isCovered = false
        if (e.raw && e.raw.properties) {
            const cov = e.raw.properties['covered'] ?? e.raw.properties['isCovered']
            if (cov === true || String(cov).toLowerCase() === 'yes' || String(cov).toLowerCase() === 'true') isCovered = true
        }
        if (coveredOnly && !isCovered) return false
        return true
    })
    const ks = kShortestPaths({ nodes: graph.nodes, edges: filteredEdges }, String(start), String(end), k, exclude)
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
                    // if caller asked for covered-only, skip this segment unless properties.covered === 'yes' or boolean true
                    if (coveredOnly) {
                        const cov = props.covered ?? (edge.raw.properties && edge.raw.properties.covered)
                        const covTrue = cov === true || String(cov).toLowerCase() === 'yes' || String(cov).toLowerCase() === 'true'
                        if (!covTrue) {
                            // skip segment (don't push features)
                            segCoords = []
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
        // helper: find levels for a coord by inspecting route features (prefer primary route)
        const findLevelsForCoord = (coord: number[] | null) => {
            if (!coord) return [] as any[]
            const eq = (a: number[], b: number[]) => a[0] === b[0] && a[1] === b[1]
            const levelsSet = new Set<any>()
            try {
                // prefer route-planner-0 if present
                const routesToCheck = allRoutes.slice()
                if (routesToCheck.length === 0) return []
                // put primary first
                routesToCheck.sort((a, b) => {
                    if (a.id === 'route-planner-0') return -1
                    if (b.id === 'route-planner-0') return 1
                    return 0
                })
                for (const rt of routesToCheck) {
                    try {
                        const feats = rt.geo && rt.geo.features ? rt.geo.features : []
                        for (const f of feats) {
                            if (!f || !f.geometry || f.geometry.type !== 'LineString') continue
                            const cs = f.geometry.coordinates
                            if (!cs || cs.length === 0) continue
                            const first = cs[0]
                            const last = cs[cs.length - 1]
                            if (eq(first as number[], coord as number[]) || eq(last as number[], coord as number[])) {
                                const p = f.properties || {}
                                if (p.level != null) levelsSet.add(p.level)
                                if (p.levels && Array.isArray(p.levels)) for (const lv of p.levels) levelsSet.add(lv)
                            }
                        }
                    } catch (e) { }
                    if (levelsSet.size) break
                }
            } catch (e) { }
            return Array.from(levelsSet)
        }
        // also add DOM markers (MapLibre `Marker`) for start/end using user's SVGs when available
        try {
            // remove previous markers if present
            try {
                const prev = (map as any).__routePlannerMarkers
                if (prev) {
                    if (prev.start && prev.start.remove) try { prev.start.remove() } catch (e) { }
                    if (prev.end && prev.end.remove) try { prev.end.remove() } catch (e) { }
                }
            } catch (e) { }

            const startNode = nodeById.get(String(start))
            const endNode = nodeById.get(String(end))

            const makeDomMarker = (node: any, role: 'start' | 'end') => {
                if (!node) return null
                try {
                    const coord = node.coord as [number, number]
                    // create element similar to MapLibre default marker
                    const el = document.createElement('div')
                    el.className = 'maplibregl-marker route-planner-marker route-planner-' + role
                    el.style.display = 'block'
                    el.style.width = '32px'
                    el.style.height = '32px'
                    el.style.boxSizing = 'border-box'
                    // attach level metadata as dataset so MapView can read it
                    // prefer levels taken from route segments that end at this coord
                    const routeLevels = findLevelsForCoord(coord)
                    if (routeLevels && routeLevels.length === 1) {
                        el.dataset.level = String(routeLevels[0])
                    } else if (routeLevels && routeLevels.length > 1) {
                        el.dataset.levels = routeLevels.join(',')
                    } else {
                        if (node.level !== undefined && node.level !== null) el.dataset.level = String(node.level)
                        if (node.levels && Array.isArray(node.levels)) el.dataset.levels = node.levels.join(',')
                    }
                    // title for accessibility / debug
                    el.title = role + (node.level !== undefined && node.level !== null ? ` (level ${node.level})` : '')
                    // use background-image like the MapLibre example so we can control size easily
                    const iconUrl = role === 'start' ? '/start-icon.svg' : '/end-icon.svg'
                    const iconSize = role === 'start' ? [36, 36] : [32, 32]
                    el.style.backgroundImage = `url(${iconUrl})`
                    el.style.backgroundSize = 'contain'
                    el.style.backgroundRepeat = 'no-repeat'
                    el.style.backgroundPosition = 'center'
                    el.style.width = iconSize[0] + 'px'
                    el.style.height = iconSize[1] + 'px'
                    el.style.cursor = 'pointer'

                    // create and add marker
                    let marker = null
                    try {
                        if (typeof maplibre !== 'undefined' && maplibre.Marker) marker = new maplibre.Marker({ element: el }).setLngLat(coord).addTo(map)
                    } catch (e) { marker = null }
                    // store meta for visibility per level
                    // compute meta.level(s) consistent with dataset used above
                    let metaLevel: any = null
                    let metaLevels: any = null
                    if (routeLevels && routeLevels.length === 1) metaLevel = routeLevels[0]
                    else if (routeLevels && routeLevels.length > 1) metaLevels = routeLevels
                    else {
                        if (node.level !== undefined && node.level !== null) metaLevel = node.level
                        if (node.levels && Array.isArray(node.levels)) metaLevels = node.levels
                    }
                    const meta: any = { marker, level: metaLevel, levels: metaLevels }
                    // set initial visibility based on map.__currentLevel if available
                    try {
                        const current = (map as any).__currentLevel
                        if (marker && marker.getElement) {
                            const el = marker.getElement()
                            if (metaLevel !== null && metaLevel !== undefined) el.style.display = (metaLevel === current) ? 'block' : 'none'
                            else if (metaLevels && Array.isArray(metaLevels)) el.style.display = (metaLevels.indexOf(current) !== -1) ? 'block' : 'none'
                            else el.style.display = 'block'
                        }
                    } catch (e) { }
                    return meta
                } catch (e) { return null }
            }

            const mkStart = makeDomMarker(startNode, 'start')
            const mkEnd = makeDomMarker(endNode, 'end')
                ; (map as any).__routePlannerMarkers = { start: mkStart ? mkStart.marker : null, end: mkEnd ? mkEnd.marker : null, startLevel: mkStart ? mkStart.level : null, endLevel: mkEnd ? mkEnd.level : null, startLevels: mkStart ? mkStart.levels : null, endLevels: mkEnd ? mkEnd.levels : null }
        } catch (e) { }
    } catch (e) { }
    // ensure the map view shows the whole route
    try {
        if (combinedCoords && combinedCoords.length) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
            for (const c of combinedCoords) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
            if (isFinite(minX)) fitBoundsSmart(map, [[minX, minY], [maxX, maxY]])
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
