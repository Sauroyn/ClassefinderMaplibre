export function chooseActiveLevel(meta: { level?: number | null; levels?: Array<number | string> | null }, currentLevel: number): number | null {
    const cands: number[] = []
    if (meta.level != null) {
        const n = Number(meta.level)
        if (!Number.isNaN(n)) cands.push(n)
    }
    if (meta.levels && Array.isArray(meta.levels)) {
        for (const v of meta.levels) {
            const n = Number(v as any)
            if (!Number.isNaN(n)) cands.push(n)
        }
    }
    if (cands.length === 0) return null
    if (cands.includes(currentLevel)) return currentLevel
    return cands[0]
}

export function setCurrentLevel(map: any, level: number) {
    try { (map as any).__currentLevel = level } catch { /* no-op */ }
    const filter = ['==', ['get', 'level'], level] as any
    try { if (map.getLayer('buildings-extrusion')) map.setFilter('buildings-extrusion', filter) } catch { }
    try { if (map.getLayer('buildings-fill')) map.setFilter('buildings-fill', filter) } catch { }
    try { if (map.getLayer('buildings-name')) map.setFilter('buildings-name', filter) } catch { }
    try {
        const style = map.getStyle && map.getStyle()
        const layers = (style && style.layers) || []
        const routeFilter: any = [
            'any',
            ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
            ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]]
        ]
        for (const lyr of layers) {
            if (lyr && typeof lyr.id === 'string' && lyr.id.startsWith('route-planner-')) {
                try { map.setFilter(lyr.id, routeFilter) } catch { }
            }
        }
    } catch { }
    try { window.dispatchEvent(new CustomEvent('level:auto', { detail: level })) } catch { }
}

// Apply marker visibility for the active level and optionally auto-switch floors.
import type { Coord } from './geometry'
import { projectOntoRouteDetailed } from './geometry'

export function applyMarkerLevelVisibilityAndAutoSwitch(
    map: any,
    markerElement: HTMLElement | null,
    coords: Coord,
    routeCoords: Coord[],
    segmentMeta: Array<{ level?: number | null, levels?: Array<number | string> | null }>,
    allowAutoSwitch: boolean = true
) {
    if (!map || !routeCoords.length || !segmentMeta.length) return
    const det = projectOntoRouteDetailed(coords, routeCoords)
    const meta = segmentMeta[Math.min(det.segIndex, segmentMeta.length - 1)] || {}
    const current: number = (map as any).__currentLevel ?? 0
    const active = chooseActiveLevel(meta, current)
    if (active != null) {
        if (markerElement) markerElement.style.display = (active === current) ? 'block' : 'none'
        if (allowAutoSwitch && active !== current) setCurrentLevel(map, active)
    } else {
        if (markerElement) markerElement.style.display = 'block'
    }
}
