import type React from 'react'
import { lengthOf, buildPerLevelOverlays } from './overlays'
import { getConnectorFeature, getRouteFeatures } from './routeData'

export type ItinRefs = {
    traveledSrcRef: React.MutableRefObject<string | null>,
    remainingSrcRef: React.MutableRefObject<string | null>,
    traveledLyrRef: React.MutableRefObject<string | null>,
    remainingLyrRef: React.MutableRefObject<string | null>,
    hiddenBaseRef: React.MutableRefObject<boolean>
}

export function rebuildItineraryOverlays(
    map: any,
    route: { id: string; layerId: string } | null,
    progress: number,
    refs: ItinRefs
) {
    if (!map || !route) return
    const conn = getConnectorFeature(map)
    const feats = getRouteFeatures(map, route.id)
    if (!feats) return

    let total = 0
    const featList: Array<{ coords: [number, number][], props: any }> = []
    if (conn && conn.geometry?.type === 'LineString') {
        const c = conn.geometry.coordinates as [number, number][]
        total += lengthOf(c as any)
        featList.push({ coords: c, props: conn.properties || {} })
    }
    for (const f of feats) {
        if (f.geometry?.type === 'LineString') {
            const c = f.geometry.coordinates as [number, number][]
            total += lengthOf(c as any)
            featList.push({ coords: c, props: f.properties || {} })
        }
    }
    if (total <= 0) return
    const cut = Math.max(0, Math.min(1, progress)) * total

    const levelNow = (map as any).__currentLevel ?? null
    const { traveled, remaining } = buildPerLevelOverlays(featList as any, cut / Math.max(1e-6, total), levelNow)

    const srcTr = refs.traveledSrcRef.current || `itinerary-${route.id}-traveled`
    const srcRm = refs.remainingSrcRef.current || `itinerary-${route.id}-remaining`
    const lyrTr = refs.traveledLyrRef.current || `itinerary-${route.id}-traveled-line`
    const lyrRm = refs.remainingLyrRef.current || `itinerary-${route.id}-remaining-line`
    refs.traveledSrcRef.current = srcTr
    refs.remainingSrcRef.current = srcRm
    refs.traveledLyrRef.current = lyrTr
    refs.remainingLyrRef.current = lyrRm

    const fcTr = { type: 'FeatureCollection', features: traveled.map(f => ({ type: 'Feature', ...f })) }
    const fcRm = { type: 'FeatureCollection', features: remaining.map(f => ({ type: 'Feature', ...f })) }
    try {
        if (map.getSource && map.getSource(srcTr)) (map.getSource(srcTr) as any).setData(fcTr)
        else if (map.addSource) map.addSource(srcTr, { type: 'geojson', data: fcTr })
    } catch { }
    try {
        if (map.getSource && map.getSource(srcRm)) (map.getSource(srcRm) as any).setData(fcRm)
        else if (map.addSource) map.addSource(srcRm, { type: 'geojson', data: fcRm })
    } catch { }

    const level = levelNow
    const routeFilter: any = level == null ? true : [
        'any',
        ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
        ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
    ]

    try {
        if (!map.getLayer || !map.getLayer(lyrRm)) {
            map.addLayer({ id: lyrRm, type: 'line', source: srcRm, paint: { 'line-color': '#9aa0a6', 'line-width': 18, 'line-opacity': 1 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
        }
        map.setFilter(lyrRm, routeFilter)
    } catch { }
    try {
        if (!map.getLayer || !map.getLayer(lyrTr)) {
            map.addLayer({ id: lyrTr, type: 'line', source: srcTr, paint: { 'line-color': '#007AFF', 'line-width': 18, 'line-opacity': 1 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
        }
        map.setFilter(lyrTr, routeFilter)
    } catch { }

    try { if (map.moveLayer && route.layerId && map.getLayer(route.layerId)) map.moveLayer(lyrRm, route.layerId) } catch { }
    try { if (map.moveLayer && route.layerId && map.getLayer(route.layerId)) map.moveLayer(lyrTr, lyrRm) } catch { }

    if (!refs.hiddenBaseRef.current) {
        try { if (route.layerId && map.getLayer && map.getLayer(route.layerId)) map.setPaintProperty(route.layerId, 'line-opacity', 0) } catch { }
        try { if (map.getLayer && map.getLayer('route-planner-user-connector-line')) map.setPaintProperty('route-planner-user-connector-line', 'line-opacity', 0) } catch { }
        refs.hiddenBaseRef.current = true
    }
}

export function removeItineraryOverlays(
    map: any,
    route: { id: string; layerId: string } | null,
    refs: ItinRefs,
    restoreBase: boolean
) {
    if (!map) return
    try {
        const lyrTr = refs.traveledLyrRef.current
        const lyrRm = refs.remainingLyrRef.current
        const srcTr = refs.traveledSrcRef.current
        const srcRm = refs.remainingSrcRef.current
        if (lyrTr && map.getLayer && map.getLayer(lyrTr)) map.removeLayer(lyrTr)
        if (lyrRm && map.getLayer && map.getLayer(lyrRm)) map.removeLayer(lyrRm)
        if (srcTr && map.getSource && map.getSource(srcTr)) map.removeSource(srcTr)
        if (srcRm && map.getSource && map.getSource(srcRm)) map.removeSource(srcRm)
    } catch { }
    refs.traveledLyrRef.current = null
    refs.remainingLyrRef.current = null
    refs.traveledSrcRef.current = null
    refs.remainingSrcRef.current = null
    if (restoreBase) {
        try { if (route && route.layerId && map.getLayer && map.getLayer(route.layerId)) map.setPaintProperty(route.layerId, 'line-opacity', 1) } catch { }
        try { if (map.getLayer && map.getLayer('route-planner-user-connector-line')) map.setPaintProperty('route-planner-user-connector-line', 'line-opacity', 0.55) } catch { }
        refs.hiddenBaseRef.current = false
    }
}
