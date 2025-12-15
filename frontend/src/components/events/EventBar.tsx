import { useEffect, useRef, useState } from 'react'
import EventSelector, { type SimpleEvent } from '../EventSelector'
import { fetchICSEvents, filterNextWeek } from '../../utils/ical'
import { loadGraphFromConfigOrFallback } from '../../utils/graph'
import { computeAndDrawRoute, computeRouteTime } from '../../map/computeRoute'

type Props = {
    icalUrl: string
    bufferMin: number
    eventsEnabled: boolean
    mapRef: any
    data: any
    onOpenPlannerWithStartEnd: (start: { id: string, name: string }, end: { id: string, name: string }) => void
    onOpenPlannerWithDest: (dest: { id: string | null, name?: string | null }) => void
    onClearRoute?: () => void
}

export default function EventBar({ icalUrl, bufferMin, eventsEnabled, mapRef, data, onOpenPlannerWithStartEnd, onOpenPlannerWithDest, onClearRoute }: Props) {
    const [events, setEvents] = useState<SimpleEvent[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const graphRef = useRef<any | null>(null)

    // load graph for precomputations once
    useEffect(() => { (async () => { graphRef.current = await loadGraphFromConfigOrFallback() })() }, [])

    // fetch and precompute
    useEffect(() => {
        let cancelled = false
        async function run() {
            if (!eventsEnabled || !icalUrl) { setEvents([]); return }
            try {
                const raw = await fetchICSEvents(icalUrl)
                const next = filterNextWeek(raw)
                const simple: SimpleEvent[] = next.map((e, idx) => {
                    const issues: string[] = []
                    if (!e.location) issues.push('Localisation manquante')
                    if (!e.summary) issues.push('Titre manquant')
                    if (!e.dtstart) issues.push('Début manquant')
                    if (!e.dtend) issues.push('Fin manquante')
                    const start = e.dtstart ?? null
                    const end = e.dtend ?? null
                    const dayKey = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString().slice(0, 10) : 'invalid'
                    return { id: e.uid || String(idx), title: e.summary ?? null, location: e.location ?? null, start, end, dayKey, issues }
                })
                simple.sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0))
                const g = graphRef.current
                const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
                const nodeByName = new Map<string, any>()
                if (g && g.nodes) for (const n of g.nodes) { const nm = normalize(String(n.name ?? n.id ?? '')); if (nm) nodeByName.set(nm, n) }
                const nearestNodeToCoord = (coord: [number, number]) => {
                    if (!g || !g.nodes) return null as string | null
                    let best: { id: string, d: number } | null = null
                    const toRad = (v: number) => v * Math.PI / 180
                    const hav = (a: [number, number], b: [number, number]) => {
                        const R = 6371000
                        const dLat = toRad(b[1] - a[1]); const dLon = toRad(b[0] - a[0])
                        const lat1 = toRad(a[1]); const lat2 = toRad(b[1])
                        const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2)
                        const c = 2 * Math.atan2(Math.sqrt(s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2), Math.sqrt(1 - (s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2)))
                        return R * c
                    }
                    for (const n of g.nodes) {
                        const d = hav(coord, n.coord as [number, number])
                        if (!best || d < best.d) best = { id: String(n.id), d }
                    }
                    return best ? best.id : null
                }
                const featureCenter = (geom: any): [number, number] | null => {
                    if (!geom) return null
                    try {
                        if (geom.type === 'Point') return geom.coordinates as [number, number]
                        const push = (arr: number[][], coords: any) => { for (const c of coords) arr.push(c as number[]) }
                        let all: number[][] = []
                        if (geom.type === 'Polygon') push(all, geom.coordinates.flat())
                        else if (geom.type === 'MultiPolygon') push(all, geom.coordinates.flat(2))
                        else if (geom.type === 'LineString') all = geom.coordinates
                        else if (geom.type === 'MultiLineString') all = geom.coordinates.flat()
                        if (all.length === 0) return null
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                        for (const c of all) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
                        return [(minX + maxX) / 2, (minY + maxY) / 2]
                    } catch { return null }
                }
                const resolveLoc = (loc: string | null): string | null => {
                    if (!loc) return null
                    const key = normalize(String(loc))
                    const n = nodeByName.get(key)
                    if (n) return String(n.id)
                    try {
                        const feats = (data && data.features) ? data.features : []
                        const byName: Array<{ f: any, n: string }> = feats.filter((f: any) => f?.properties?.name).map((f: any) => ({ f, n: normalize(String(f.properties.name)) }))
                        let found = byName.find((x: { f: any, n: string }) => x.n === key)
                        if (!found) {
                            const candidates = byName.filter((x: { f: any, n: string }) => x.n.includes(key) || key.includes(x.n))
                            if (candidates.length === 1) found = candidates[0]
                        }
                        if (found) { const ctr = featureCenter(found.f.geometry); if (ctr) return nearestNodeToCoord(ctr) }
                    } catch { }
                    return null
                }
                for (let i = 0; i < simple.length; i++) {
                    const cur = simple[i]
                    const prev = simple.slice(0, i).reverse().find(ev => ev.dayKey === cur.dayKey)
                    if (!prev) { cur.precomputed = { fromPrevSeconds: null, fromUserPossible: true }; continue }
                    const a = resolveLoc(prev.location)
                    const b = resolveLoc(cur.location)
                    if (a && b && a === b) { cur.precomputed = { fromPrevSeconds: null, fromUserPossible: true }; continue }
                    if (!a || !b || !g) { cur.precomputed = { fromPrevSeconds: null, fromUserPossible: undefined }; continue }
                    try {
                        const res = await computeRouteTime({ graph: g, start: a, end: b, excludeStairs: false, coveredOnly: false, mapRef })
                        const secs = res?.seconds ?? null
                        const gap = (cur.start && prev.end) ? ((cur.start.getTime() - prev.end.getTime()) / 1000) : null
                        const fromUserPossible = (secs != null && gap != null) ? ((secs + bufferMin * 60) < gap) : undefined
                        cur.precomputed = { fromPrevSeconds: secs, fromUserPossible }
                    } catch { cur.precomputed = { fromPrevSeconds: null, fromUserPossible: undefined } }
                }
                if (!cancelled) setEvents(simple)
            } catch { if (!cancelled) setEvents([]) }
        }
        run(); return () => { cancelled = true }
    }, [icalUrl, bufferMin, eventsEnabled, data, mapRef])

    if (!eventsEnabled || !events || events.length === 0) return null

    return (
        <EventSelector
            events={events}
            selectedId={selectedId}
            onClear={() => { setSelectedId(null); onClearRoute?.() }}
            onSelect={async (ev) => {
                const g = graphRef.current
                if (!g) return
                setSelectedId(ev.id)
                const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}+/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
                const nodeByName = new Map<string, any>()
                for (const n of g.nodes) { const nm = normalize(String(n.name ?? n.id ?? '')); if (nm) nodeByName.set(nm, n) }
                const nearestNodeToCoord = (coord: [number, number]) => {
                    let best: { id: string, d: number } | null = null
                    const toRad = (v: number) => v * Math.PI / 180
                    const hav = (a: [number, number], b: [number, number]) => {
                        const R = 6371000
                        const dLat = toRad(b[1] - a[1]); const dLon = toRad(b[0] - a[0])
                        const lat1 = toRad(a[1]); const lat2 = toRad(b[1])
                        const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2)
                        const c = 2 * Math.atan2(Math.sqrt(s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2), Math.sqrt(1 - (s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2)))
                        return R * c
                    }
                    for (const n of g.nodes) {
                        const d = hav(coord, n.coord as [number, number])
                        if (!best || d < best.d) best = { id: String(n.id), d }
                    }
                    return best ? best.id : null
                }
                const featureCenter = (geom: any): [number, number] | null => {
                    if (!geom) return null
                    try {
                        if (geom.type === 'Point') return geom.coordinates as [number, number]
                        const push = (arr: number[][], coords: any) => { for (const c of coords) arr.push(c as number[]) }
                        let all: number[][] = []
                        if (geom.type === 'Polygon') push(all, geom.coordinates.flat())
                        else if (geom.type === 'MultiPolygon') push(all, geom.coordinates.flat(2))
                        else if (geom.type === 'LineString') all = geom.coordinates
                        else if (geom.type === 'MultiLineString') all = geom.coordinates.flat()
                        if (all.length === 0) return null
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
                        for (const c of all) { const x = c[0], y = c[1]; if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y }
                        return [(minX + maxX) / 2, (minY + maxY) / 2]
                    } catch { return null }
                }
                const resolveLoc = (loc: string | null): string | null => {
                    if (!loc) return null
                    const nrm = normalize(String(loc))
                    const n = nodeByName.get(nrm)
                    if (n) return String(n.id)
                    try {
                        const feats = (data && data.features) ? data.features : []
                        const byName: Array<{ f: any, n: string }> = feats.filter((f: any) => f?.properties?.name).map((f: any) => ({ f, n: normalize(String(f.properties.name)) }))
                        let found = byName.find((x: { f: any, n: string }) => x.n === nrm)
                        if (!found) {
                            const candidates = byName.filter((x: { f: any, n: string }) => x.n.includes(nrm) || nrm.includes(x.n))
                            if (candidates.length === 1) found = candidates[0]
                        }
                        if (found) { const ctr = featureCenter(found.f.geometry); if (ctr) return nearestNodeToCoord(ctr) }
                    } catch { }
                    return null
                }
                const prev = events.filter(e => e.start && ev.start && e.start < ev.start && e.dayKey === ev.dayKey).slice(-1)[0]
                const startIdPrev = resolveLoc(prev?.location ?? null)
                const endId = resolveLoc(ev.location)
                let usePrev = !!(prev && startIdPrev && endId)
                if (!endId) { alert('Localisation manquante ou introuvable pour cet événement.'); return }
                if (usePrev && startIdPrev === endId) usePrev = false
                if (usePrev) {
                    const res = await computeRouteTime({ graph: g, start: startIdPrev!, end: endId!, excludeStairs: false, coveredOnly: false, mapRef })
                    const secs = res?.seconds ?? null
                    const gap = (ev.start && prev!.end) ? ((ev.start.getTime() - prev!.end.getTime()) / 1000) : null
                    if (secs != null && gap != null && (secs + bufferMin * 60) >= gap) {
                        await computeAndDrawRoute({ graph: g, start: startIdPrev!, end: endId!, excludeStairs: false, coveredOnly: false, mapRef, k: 1, draw: true })
                        onOpenPlannerWithStartEnd({ id: startIdPrev!, name: prev?.location || 'Départ' }, { id: endId!, name: ev.location || 'Arrivée' })
                        return
                    }
                }
                const geolocate = () => new Promise<{ lng: number, lat: number }>((resolve, reject) => {
                    try { navigator.geolocation.getCurrentPosition((pos) => resolve({ lng: pos.coords.longitude, lat: pos.coords.latitude }), (err) => reject(err), { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 }) } catch (e) { reject(e) }
                })
                try {
                    const user = await geolocate()
                    let bestId: string | null = null
                    let bestD = Infinity
                    const toRad = (v: number) => v * Math.PI / 180
                    const hav = (a: [number, number], b: [number, number]) => {
                        const R = 6371000
                        const dLat = toRad(b[1] - a[1]); const dLon = toRad(b[0] - a[0])
                        const lat1 = toRad(a[1]); const lat2 = toRad(b[1])
                        const s1 = Math.sin(dLat / 2), s2 = Math.sin(dLon / 2)
                        const c = 2 * Math.atan2(Math.sqrt(s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2), Math.sqrt(1 - (s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2)))
                        return R * c
                    }
                    for (const n of g.nodes) { const d = hav([user.lng, user.lat], n.coord as [number, number]); if (d < bestD) { bestD = d; bestId = String(n.id) } }
                    if (bestId) {
                        await computeAndDrawRoute({ graph: g, start: bestId, end: endId!, excludeStairs: false, coveredOnly: false, mapRef, k: 1, draw: true, userOriginLngLat: [user.lng, user.lat] })
                        onOpenPlannerWithStartEnd({ id: bestId, name: 'Ma position' }, { id: endId!, name: ev.location || 'Arrivée' })
                        return
                    }
                } catch { }
                onOpenPlannerWithDest({ name: ev.title ?? ev.location ?? 'Destination', id: endId })
            }}
        />
    )
}
