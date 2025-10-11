import maplibre from 'maplibre-gl'

export const USER_CONNECTOR_LEVEL = 1
export const USER_CONNECTOR_COLOR = '#007bff'
export const USER_CONNECTOR_OPACITY = 1
export const USER_CONNECTOR_WIDTH = 18

export function drawUserConnector(map: any, graph: any, ks: any[], userOriginLngLat?: [number, number], nodeById?: Map<string, any>, combinedCoords?: number[][]) {
    if (!userOriginLngLat || !ks || ks.length === 0) return
    const nb = nodeById || new Map<string, any>(graph.nodes.map((n: any) => [String(n.id), n]))
    const startNodeId = String(ks[0].path[0])
    const startNode = nb.get(startNodeId)
    if (!startNode || !Array.isArray(startNode.coord)) return
    // toujours dessiner le connecteur utilisateur -> graphe
    const connId = 'route-planner-user-connector'
    const fc = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: [userOriginLngLat, startNode.coord] }, properties: { level: USER_CONNECTOR_LEVEL } }]
    }
    if (map.getSource && map.getSource(connId)) (map.getSource(connId) as any).setData(fc as any)
    else if (map.addSource) map.addSource(connId, { type: 'geojson', data: fc })
    const layerId = connId + '-line'
    if (!map.getLayer || !map.getLayer(layerId)) {
        map.addLayer({ id: layerId, type: 'line', source: connId, paint: { 'line-color': USER_CONNECTOR_COLOR, 'line-width': USER_CONNECTOR_WIDTH, 'line-opacity': USER_CONNECTOR_OPACITY }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
    } else {
        map.setPaintProperty(layerId, 'line-color', USER_CONNECTOR_COLOR)
        map.setPaintProperty(layerId, 'line-width', USER_CONNECTOR_WIDTH)
        map.setPaintProperty(layerId, 'line-opacity', USER_CONNECTOR_OPACITY)
    }
    try { if (map.moveLayer) map.moveLayer('route-planner-0-line') } catch { }
    try { if (combinedCoords) { combinedCoords.push(userOriginLngLat as any); combinedCoords.push(startNode.coord as any) } } catch { }
}

export function placeMarkers(map: any, graph: any, start: string, end: string, ks: any[], userOriginLngLat?: [number, number]) {
    const nodeById = new Map<string, any>(graph.nodes.map((n: any) => [String(n.id), n]))
    const findLevelsForCoord = (coord: number[] | null, allRoutes: any[]) => {
        if (!coord) return [] as any[]
        const eq = (a: number[], b: number[]) => a[0] === b[0] && a[1] === b[1]
        const levelsSet = new Set<any>()
        const routesToCheck = allRoutes.slice()
        routesToCheck.sort((a, b) => (a.id === 'route-planner-0' ? -1 : b.id === 'route-planner-0' ? 1 : 0))
        for (const rt of routesToCheck) {
            const feats = rt.geo && rt.geo.features ? rt.geo.features : []
            for (const f of feats) {
                if (!f || !f.geometry || f.geometry.type !== 'LineString') continue
                const cs = f.geometry.coordinates
                const first = cs[0]; const last = cs[cs.length - 1]
                if (eq(first as number[], coord as number[]) || eq(last as number[], coord as number[])) {
                    const p = f.properties || {}
                    if (p.level != null) levelsSet.add(p.level)
                    if (p.levels && Array.isArray(p.levels)) for (const lv of p.levels) levelsSet.add(lv)
                }
            }
            if (levelsSet.size) break
        }
        return Array.from(levelsSet)
    }

    // build a minimal allRoutes structure from sources currently present
    const allRoutes = ks.map((_, idx) => ({ id: `route-planner-${idx}`, geo: (map.getSource && map.getSource(`route-planner-${idx}`)) ? (map.getSource(`route-planner-${idx}`) as any)._data : null }))

    const startNode = nodeById.get(String(start))
    const endNode = nodeById.get(String(end))

    const makeDomMarker = (node: any, role: 'start' | 'end') => {
        if (!node) return null
        const coord = (role === 'start' && userOriginLngLat) ? (userOriginLngLat as [number, number]) : (node.coord as [number, number])
        const el = document.createElement('div')
        el.className = 'maplibregl-marker route-planner-marker route-planner-' + role
        el.style.display = 'block'
        el.style.width = '32px'
        el.style.height = '32px'
        el.style.boxSizing = 'border-box'
        const routeLevels = (role === 'start' && userOriginLngLat) ? [USER_CONNECTOR_LEVEL] : findLevelsForCoord(coord, allRoutes)
        if (routeLevels && routeLevels.length === 1) el.dataset.level = String(routeLevels[0])
        else if (routeLevels && routeLevels.length > 1) el.dataset.levels = routeLevels.join(',')
        else {
            if (node.level !== undefined && node.level !== null) el.dataset.level = String(node.level)
            if (node.levels && Array.isArray(node.levels)) el.dataset.levels = node.levels.join(',')
        }
        el.title = role + (node.level !== undefined && node.level !== null ? ` (level ${node.level})` : '')
        const prefix = (import.meta.env && (import.meta.env.BASE_URL || '/'))
        const iconUrl = role === 'start' ? (prefix + 'start-icon.svg') : (prefix + 'end-icon.svg')
        const iconSize = role === 'start' ? [36, 36] : [32, 32]
        el.style.backgroundImage = `url(${iconUrl})`
        el.style.backgroundSize = 'contain'
        el.style.backgroundRepeat = 'no-repeat'
        el.style.backgroundPosition = 'center'
        el.style.width = iconSize[0] + 'px'
        el.style.height = iconSize[1] + 'px'
        el.style.cursor = 'pointer'
        let marker = null
        try { if (typeof maplibre !== 'undefined' && maplibre.Marker) marker = new maplibre.Marker({ element: el }).setLngLat(coord).addTo(map) } catch { marker = null }
        const metaLevel = routeLevels && routeLevels.length === 1 ? routeLevels[0] : (node.level ?? null)
        const metaLevels = routeLevels && routeLevels.length > 1 ? routeLevels : (node.levels ?? null)
        try {
            const current = (map as any).__currentLevel
            if (marker && (marker as any).getElement) {
                const mEl = (marker as any).getElement()
                // Si on utilise la position utilisateur pour le départ, toujours afficher le marqueur de départ
                if (role === 'start' && userOriginLngLat) {
                    mEl.style.display = 'block'
                } else {
                    if (metaLevel !== null && metaLevel !== undefined) mEl.style.display = (metaLevel === current) ? 'block' : 'none'
                    else if (metaLevels && Array.isArray(metaLevels)) mEl.style.display = (metaLevels.indexOf(current) !== -1) ? 'block' : 'none'
                    else mEl.style.display = 'block'
                }
            }
        } catch { }
        return { marker, level: metaLevel, levels: metaLevels }
    }

    try {
        const prev = (map as any).__routePlannerMarkers
        if (prev) { prev.start?.remove?.(); prev.end?.remove?.() }
    } catch { }

    const mkStart = makeDomMarker(startNode, 'start')
    const mkEnd = makeDomMarker(endNode, 'end')
        ; (map as any).__routePlannerMarkers = { start: mkStart ? mkStart.marker : null, end: mkEnd ? mkEnd.marker : null, startLevel: mkStart ? mkStart.level : null, endLevel: mkEnd ? mkEnd.level : null, startLevels: mkStart ? mkStart.levels : null, endLevels: mkEnd ? mkEnd.levels : null }
}
