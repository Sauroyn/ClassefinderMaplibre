/**
 * Geolocation utilities: promise wrappers & safe helpers.
 */
export type GeoPosition = { lng: number; lat: number }

/** Options used across the app for high-accuracy reads */
export const DEFAULT_GEOLOCATION_OPTS: PositionOptions = {
    enableHighAccuracy: true,
    maximumAge: 30000,
    timeout: 8000
}

/** Wrap navigator.geolocation.getCurrentPosition in a Promise */
export function getCurrentPosition(options: PositionOptions = DEFAULT_GEOLOCATION_OPTS): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        try {
            navigator.geolocation.getCurrentPosition(resolve, reject, options)
        } catch (err) {
            reject(err)
        }
    })
}

/** Get user coords [lng, lat] or null if unavailable */
export async function getUserCoords(options: PositionOptions = DEFAULT_GEOLOCATION_OPTS): Promise<[number, number] | null> {
    try {
        const pos = await getCurrentPosition(options)
        return [pos.coords.longitude, pos.coords.latitude]
    } catch {
        return null
    }
}

/** Resolve nearest node id from a graph to user position. Returns { id, coord } or null */
export async function getNearestGraphNode(graph: { nodes: any[] }, levelPredicate?: (n: any) => boolean): Promise<{ id: string; coord: [number, number] } | null> {
    if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) return null
    const user = await getUserCoords()
    if (!user) return null
    const toRad = (v: number) => v * Math.PI / 180
    const hav = (a: [number, number], b: [number, number]) => {
        const R = 6371000
        const dLat = toRad(b[1] - a[1]); const dLon = toRad(b[0] - a[0])
        const lat1 = toRad(a[1]); const lat2 = toRad(b[1])
        const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2), Math.sqrt(1 - (s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2)))
        return R * c
    }
    let best: { id: string; coord: [number, number] } | null = null
    let bestD = Infinity
    for (const n of graph.nodes) {
        if (levelPredicate && !levelPredicate(n)) continue
        const coord = n.coord as [number, number]
        if (!coord) continue
        const d = hav(user, coord)
        if (d < bestD) { bestD = d; best = { id: String(n.id), coord } }
    }
    // fallback without level predicate
    if (!best && levelPredicate) {
        for (const n of graph.nodes) {
            const coord = n.coord as [number, number]
            if (!coord) continue
            const d = hav(user, coord)
            if (d < bestD) { bestD = d; best = { id: String(n.id), coord } }
        }
    }
    return best
}
