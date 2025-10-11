import type { Coord } from './geometry'
import { haversineDistance } from './geometry'

export type SegmentMeta = { level?: number | null, levels?: Array<number | string> | null }

export function getConnectorFeature(map: any): any | null {
    try {
        const src: any = map.getSource && map.getSource('route-planner-user-connector')
        const d = src ? src._data : null
        if (d && d.features && d.features[0]) return d.features[0]
    } catch { }
    return null
}

export function getRouteFeatures(map: any, srcId: string): any[] | null {
    try {
        const src: any = map.getSource && map.getSource(srcId)
        const d = src ? src._data : null
        if (d && Array.isArray(d.features)) return d.features
    } catch { }
    return null
}

export function buildFullRouteWithLevels(
    map: any,
    routeId: string | null,
    nodeCoords: Coord[]
): { coords: Coord[]; segMeta: SegmentMeta[] } {
    const out: Coord[] = []
    const meta: SegmentMeta[] = []

    const appendSegment = (seg: Coord[], props?: any) => {
        if (!seg || seg.length < 2) return
        let coords = seg.slice()
        if (out.length > 0) {
            const last = out[out.length - 1]
            const dStart = haversineDistance(last, coords[0])
            const dEnd = haversineDistance(last, coords[coords.length - 1])
            if (dEnd < dStart) coords = coords.slice().reverse() as Coord[]
            const dToFirst = haversineDistance(last, coords[0])
            if (dToFirst > 5) {
                // gap too large: start fresh chain without forcing a straight segment
            }
        }
        for (let i = 0; i < coords.length - 1; i++) {
            const a = coords[i]
            const b = coords[i + 1]
            if (out.length === 0) out.push(a)
            else {
                const last = out[out.length - 1]
                if (!(last[0] === a[0] && last[1] === a[1])) out.push(a)
            }
            out.push(b)
            const lvl = normalizeMaybeNumber(props?.level)
            const lvls = normalizeMaybeLevels(props?.levels)
            meta.push({ level: lvl, levels: lvls })
        }
    }

    try {
        const conn = getConnectorFeature(map)
        if (conn && conn.geometry?.type === 'LineString') {
            appendSegment(conn.geometry.coordinates as Coord[], conn.properties || {})
        }
    } catch { }

    try {
        if (routeId) {
            const feats = getRouteFeatures(map, routeId)
            if (feats) {
                for (const f of feats) {
                    if (f.geometry?.type === 'LineString') appendSegment(f.geometry.coordinates as Coord[], f.properties || {})
                }
            }
        } else {
            for (let i = 0; i < nodeCoords.length - 1; i++) appendSegment([nodeCoords[i], nodeCoords[i + 1]], {})
        }
    } catch { }

    const compact: Coord[] = []
    for (const c of out) {
        if (!compact.length) { compact.push(c); continue }
        const last = compact[compact.length - 1]
        if (last[0] === c[0] && last[1] === c[1]) continue
        compact.push(c)
    }
    return { coords: compact.length ? compact : out, segMeta: meta }
}

function normalizeMaybeNumber(v: any): number | null {
    if (v === null || v === undefined) return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}

function normalizeMaybeLevels(arr: any): Array<number | string> | null {
    if (!arr || !Array.isArray(arr)) return null
    return arr.map((x: any) => { const n = Number(x); return Number.isFinite(n) ? n : String(x) })
}
