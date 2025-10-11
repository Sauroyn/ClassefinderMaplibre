import { haversine } from '../../../map/measure'

export type Coord = [number, number]
export type SegmentMeta = { level?: number | null; levels?: Array<number | string> | null }
export type FeatureLike = { geometry: { type: 'LineString'; coordinates: Coord[] }; properties?: any }

export function lengthOf(coords: Coord[]): number {
    let s = 0
    for (let i = 1; i < coords.length; i++) s += haversine(coords[i - 1] as any, coords[i] as any)
    return s
}

export function splitLineStringByDistance(coords: Coord[], cutMeters: number): [Coord[], Coord[]] {
    if (!coords || coords.length < 2 || cutMeters <= 0) return [[], coords.slice()]
    let acc = 0
    for (let i = 0; i < coords.length - 1; i++) {
        const a = coords[i]
        const b = coords[i + 1]
        const seg = haversine(a as any, b as any)
        if (acc + seg < cutMeters) { acc += seg; continue }
        const remain = cutMeters - acc
        const t = Math.max(0, Math.min(1, remain / Math.max(1e-6, seg)))
        const mid: Coord = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
        const pre = coords.slice(0, i + 1)
        pre.push(mid)
        const post = [mid, ...coords.slice(i + 1)]
        return [pre, post]
    }
    return [coords.slice(), []]
}

export function buildPerLevelOverlays(
    items: Array<{ coords: Coord[]; props: any }>,
    progress01: number,
    currentLevel: number | null
) {
    // compute total length
    const total = items.reduce((acc, it) => acc + lengthOf(it.coords), 0)
    if (total <= 0) return { traveled: [], remaining: [] }
    const cut = Math.max(0, Math.min(1, progress01)) * total

    const traveled: FeatureLike[] = []
    const remaining: FeatureLike[] = []
    let acc = 0
    for (const it of items) {
        const L = lengthOf(it.coords)
        const start = acc
        const end = acc + L
        const p = it.props || {}
        // keep only features that declare level/levels and match currentLevel
        const match = (lvl: number | null, lvls: any[] | null) => {
            if (currentLevel == null) return false
            if (lvl != null) return Number(lvl) === currentLevel
            if (Array.isArray(lvls)) return lvls.map(Number).includes(currentLevel)
            return false
        }
        const lvl = (p.level != null) ? Number(p.level) : null
        const lvls = Array.isArray(p.levels) ? p.levels : null
        if (!match(lvl, lvls)) { acc = end; continue }

        if (cut <= start + 1e-6) {
            remaining.push({ geometry: { type: 'LineString', coordinates: it.coords }, properties: { ...p } })
        } else if (cut >= end - 1e-6) {
            traveled.push({ geometry: { type: 'LineString', coordinates: it.coords }, properties: { ...p } })
        } else {
            const within = cut - start
            const [pre, post] = splitLineStringByDistance(it.coords, within)
            if (pre.length >= 2) traveled.push({ geometry: { type: 'LineString', coordinates: pre }, properties: { ...p } })
            if (post.length >= 2) remaining.push({ geometry: { type: 'LineString', coordinates: post }, properties: { ...p } })
        }
        acc = end
    }
    return { traveled, remaining }
}
