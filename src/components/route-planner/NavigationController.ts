import { useEffect, useRef, useState } from 'react'
import maplibre from 'maplibre-gl'
import type { RouteItem } from './MobileSheets'
import { haversine } from '../../map/measure'
import { updateRouteProgress, getOrderedChainFor } from '../../map/route/draw'

// Constantes configurables
// Distance max (en mètres) entre la position réelle et la ligne du trajet pour garder le suivi
// Au-delà, on recalcule l'itinéraire depuis la position réelle.
export const MAX_SNAP_DISTANCE_METERS = 20
// Distance (en mètres) avant le point d'arrivée pour considérer le trajet comme terminé
export const FINISH_DISTANCE_METERS = 10

export type NavigationState = {
    active: boolean
    route: RouteItem | null
    userPosition: [number, number] | null
    currentStep: number
    floor: string | null
    error?: string
}

export function useNavigationController(route: RouteItem | null, onExit: () => void, mapRef?: any) {
    const [state, setState] = useState<NavigationState>({
        active: !!route,
        route,
        userPosition: null,
        currentStep: 0,
        floor: null,
    })
    const watchId = useRef<number | null>(null)
    const manualOverride = useRef<boolean>(false)
    const mapRefCached = useRef<any>(null)
    const navMarkerRef = useRef<maplibre.Marker | null>(null)
    const lastHeadingRef = useRef<number | null>(null)
    const lastSnappedRef = useRef<[number, number] | null>(null)
    const animReqRef = useRef<number | null>(null)
    const lastRecalcAtRef = useRef<number>(0)
    // Track last real user position to avoid re-animating when unchanged (e.g., map panning)
    const lastUserRealRef = useRef<[number, number] | null>(null)
    // Track current marker logical level
    const navMarkerLevelRef = useRef<number | null>(null)

    useEffect(() => {
        mapRefCached.current = mapRef && mapRef.current ? (mapRef.current.getMap ? mapRef.current.getMap() : (mapRef.current.map ?? mapRef.current)) : null
    }, [mapRef])

    // Utilities
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)

    // Calcule le point le plus proche sur le trajet (basé sur steps) et la distance cumulée parcourue le long du trajet
    function snapToRoute(point: [number, number], steps: Array<{ coords: [number[], number[]], distance: number }>) {
        if (!steps || !steps.length) return { snapped: null as [number, number] | null, along: 0, segIndex: -1, segT: 0, realToSnapDist: Infinity }
        let bestDist = Infinity
        let bestP: [number, number] | null = null
        let bestSeg = -1
        let bestT = 0
        let cumBefore = 0
        let cumAtBest = 0
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i]
            const a = s.coords[0] as [number, number]
            const b = s.coords[1] as [number, number]
            // projection sur segment a->b (approx equirectangulaire locale)
            const lat0 = (a[1] + b[1]) * 0.5 * Math.PI / 180
            const kx = Math.cos(lat0) * 111320 // m/deg approx en x
            const ky = 110540 // m/deg approx en y
            const ax = a[0] * kx, ay = a[1] * ky
            const bx = b[0] * kx, by = b[1] * ky
            const px = point[0] * kx, py = point[1] * ky
            const vx = bx - ax, vy = by - ay
            const wx = px - ax, wy = py - ay
            const vv = vx * vx + vy * vy
            const t = vv > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / vv)) : 0
            const sx = ax + vx * t, sy = ay + vy * t
            const snap: [number, number] = [sx / kx, sy / ky]
            const d = haversine(point, snap)
            if (d < bestDist) {
                bestDist = d
                bestP = snap
                bestSeg = i
                bestT = t
                cumAtBest = cumBefore + (s.distance * t)
            }
            cumBefore += s.distance
        }
        return { snapped: bestP, along: cumAtBest, segIndex: bestSeg, segT: bestT, realToSnapDist: bestDist }
    }

    function ensureNavMarker(map: any, initialLngLat: [number, number]) {
        if (navMarkerRef.current) return navMarkerRef.current
        const el = document.createElement('div')
        el.style.width = '36px'
        el.style.height = '36px'
        el.style.display = 'flex'
        el.style.alignItems = 'center'
        el.style.justifyContent = 'center'
        el.style.pointerEvents = 'none'
        el.style.transformOrigin = '50% 50%'
        // Blue arrow with white outline, default pointing up; we'll rotate to heading
        const svgNS = 'http://www.w3.org/2000/svg'
        const svg = document.createElementNS(svgNS, 'svg')
        svg.setAttribute('width', '36')
        svg.setAttribute('height', '36')
        svg.setAttribute('viewBox', '0 0 36 36')
        const poly = document.createElementNS(svgNS, 'polygon')
        // Up-pointing arrow polygon
        poly.setAttribute('points', '18,3 30,30 18,24 6,30')
        poly.setAttribute('fill', '#007bff')
        poly.setAttribute('stroke', '#ffffff')
        poly.setAttribute('stroke-width', '3')
        poly.setAttribute('stroke-linejoin', 'round')
        svg.appendChild(poly)
        el.appendChild(svg)
        // Important: set initial position before adding to the map to avoid internal null lngLat errors
        const mk = new maplibre.Marker({ element: el, rotationAlignment: 'map' as any, pitchAlignment: 'map' as any })
        try { mk.setLngLat(initialLngLat) } catch { }
        try { navMarkerRef.current = mk.addTo(map) } catch { navMarkerRef.current = mk }
        try { (map as any).__navMarkerEl = el } catch { }
        return mk
    }

    function bearingDegrees(a: [number, number], b: [number, number]) {
        const toRad = (d: number) => d * Math.PI / 180
        const toDeg = (r: number) => r * 180 / Math.PI
        const φ1 = toRad(a[1]), φ2 = toRad(b[1])
        const Δλ = toRad(b[0] - a[0])
        const y = Math.sin(Δλ) * Math.cos(φ2)
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
        let deg = (toDeg(Math.atan2(y, x)) + 360) % 360
        return deg
    }

    // Projection util (equirectangular local approx) for polyline
    function projectOnPolyline(pt: [number, number], coords: number[][]) {
        let bestDist = Infinity
        let bestAlong = 0
        let bestIdx = -1
        let bestT = 0
        let totalLen = 0
        let alongRun = 0
        const toMeters = (a: [number, number], b: [number, number]) => haversine(a, b)
        const projectOnSeg = (p: [number, number], a: [number, number], b: [number, number]) => {
            const lat0 = (a[1] + b[1]) * 0.5 * Math.PI / 180
            const kx = Math.cos(lat0) * 111320, ky = 110540
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
            return { t, d }
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
                bestIdx = i - 1
                bestT = t
            }
            alongRun += segLen
        }
        return { dist: bestDist, along: bestAlong, segIndex: bestIdx, t: bestT, total: totalLen }
    }

    function computeHeadingFromOrderedChain(route: RouteItem, snapped: [number, number]): number | null {
        const routeSourceId = (route.id || 'route-planner-0') as string
        const chain = getOrderedChainFor(routeSourceId)
        if (!chain || chain.length < 2) return null
        const pj = projectOnPolyline(snapped, chain)
        const lookAhead = 10 // meters ahead for heading
        const targetAlong = Math.min(pj.total, pj.along + lookAhead)
        // Walk the chain to find the target coordinate at targetAlong
        let run = 0
        for (let i = 1; i < chain.length; i++) {
            const a = chain[i - 1] as [number, number]
            const b = chain[i] as [number, number]
            const segLen = haversine(a, b)
            if (run + segLen >= targetAlong) {
                const remain = targetAlong - run
                const t = segLen > 0 ? Math.max(0, Math.min(1, remain / segLen)) : 0
                const target: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
                // If snapped equals target due to very small lookAhead, extend a bit more
                const near = (p: [number, number], q: [number, number]) => Math.abs(p[0] - q[0]) < 1e-12 && Math.abs(p[1] - q[1]) < 1e-12
                const tgt = near(snapped, target) && i + 1 < chain.length ? (chain[i + 1] as [number, number]) : target
                return bearingDegrees(snapped, tgt)
            }
            run += segLen
        }
        // Fallback: bearing to the last point
        return bearingDegrees(snapped, chain[chain.length - 1] as [number, number])
    }

    function computeRouteHeading(route: RouteItem, snapped: [number, number], segIndex: number, segT: number): number | null {
        // Prefer using the exact same ordered chain as coloring
        try {
            const fromChain = computeHeadingFromOrderedChain(route, snapped)
            if (fromChain != null) return fromChain
        } catch { /* ignore and fallback to steps */ }
        const stepsArr = (route.steps || []) as Array<{ coords: [number[], number[]], distance: number }>
        if (!stepsArr.length || segIndex < 0 || segIndex >= stepsArr.length) return null
        const cur = stepsArr[segIndex]
        const a = cur.coords[0] as [number, number]
        const b = cur.coords[1] as [number, number]
        // Forward direction toward arrival: choose endpoint that is closer to the global route end
        const routeEnd = stepsArr[stepsArr.length - 1].coords[1] as [number, number]
        const distAtoEnd = haversine(a, routeEnd)
        const distBtoEnd = haversine(b, routeEnd)
        let target: [number, number] = distBtoEnd <= distAtoEnd ? b : a
        // If almost at the chosen endpoint, look ahead to the next step's end if exists
        if (segT > 0.98 && segIndex + 1 < stepsArr.length) {
            const nextEnd = stepsArr[segIndex + 1].coords[1] as [number, number]
            target = nextEnd
        }
        const near = (p: [number, number], q: [number, number]) => Math.abs(p[0] - q[0]) < 1e-12 && Math.abs(p[1] - q[1]) < 1e-12
        if (near(snapped, target)) {
            if (segIndex + 1 < stepsArr.length) target = stepsArr[segIndex + 1].coords[1] as [number, number]
        }
        if (near(snapped, target)) return lastHeadingRef.current
        const geoBearing = bearingDegrees(snapped, target)
        return geoBearing
    }

    function updateMarkerLevelVisibility(map: any, lvl: number | null) {
        try {
            const mk = navMarkerRef.current
            const el = mk && (mk as any).getElement ? (mk as any).getElement() as HTMLElement : ((map as any).__navMarkerEl as HTMLElement | null)
            if (!el) return
            const current = (map as any)?.__currentLevel
            if (lvl == null) {
                el.style.display = 'block'
            } else {
                el.style.display = (current === lvl) ? 'block' : 'none'
            }
        } catch { }
    }

    function updateProgress(map: any, route: RouteItem, along: number) {
        try {
            const routeSourceId = (route.id || 'route-planner-0') as string
            // Passer la distance cumulée complète: la fonction draw.ts combine connecteur + route
            const user = lastUserRealRef.current || undefined
            // Construire un polyline continu à partir des steps (ordre garanti du départ vers l'arrivée)
            let stepsPolyline: number[][] | undefined
            try {
                const coords: number[][] = []
                const stepsArr = (route.steps || []) as Array<{ coords: [number[], number[]] }>
                for (let i = 0; i < stepsArr.length; i++) {
                    const a = stepsArr[i].coords[0] as number[]
                    const b = stepsArr[i].coords[1] as number[]
                    if (i === 0) coords.push(a)
                    coords.push(b)
                }
                if (coords.length >= 2) stepsPolyline = coords
            } catch { }
            updateRouteProgress(map, routeSourceId, along, user as any, stepsPolyline)
        } catch (e) {
            console.warn('Error in updateProgress:', e)
        }
    }

    function animateMarkerTo(map: any, target: [number, number]) {
        const start = lastSnappedRef.current || target
        const mk = ensureNavMarker(map, start)
        const duration = 450
        const t0 = performance.now()
        if (animReqRef.current) cancelAnimationFrame(animReqRef.current)
        const step = () => {
            const t = Math.min(1, (performance.now() - t0) / duration)
            const et = ease(t)
            const lng = lerp(start[0], target[0], et)
            const lat = lerp(start[1], target[1], et)
            try { mk.setLngLat([lng, lat]) } catch { }
            if (t < 1) animReqRef.current = requestAnimationFrame(step)
            else animReqRef.current = null
        }
        animReqRef.current = requestAnimationFrame(step)
        lastSnappedRef.current = target
    }

    function distanceToEndFrom(route: RouteItem, snapped: [number, number]): number {
        if (!route || !route.steps || !route.steps.length) return Infinity
        // approx: sum remaining steps distances from the segment where snapped lies, plus tail of that segment
        // We'll find nearest segment again to get remaining proportion.
        let bestIdx = -1, bestT = 0
        let bestD = Infinity
        for (let i = 0; i < route.steps.length; i++) {
            const s: any = route.steps[i]
            const a = s.coords[0] as [number, number]
            const b = s.coords[1] as [number, number]
            const lat0 = (a[1] + b[1]) * 0.5 * Math.PI / 180
            const kx = Math.cos(lat0) * 111320, ky = 110540
            const ax = a[0] * kx, ay = a[1] * ky
            const bx = b[0] * kx, by = b[1] * ky
            const px = snapped[0] * kx, py = snapped[1] * ky
            const vx = bx - ax, vy = by - ay
            const wx = px - ax, wy = py - ay
            const vv = vx * vx + vy * vy
            const t = vv > 0 ? Math.max(0, Math.min(1, (wx * vx + wy * wy) / vv)) : 0
            const sx = ax + vx * t, sy = ay + vy * t
            const spt: [number, number] = [sx / kx, sy / ky]
            const d = haversine(snapped, spt)
            if (d < bestD) { bestD = d; bestIdx = i; bestT = t }
        }
        if (bestIdx < 0) return Infinity
        let remaining = 0
        const st0: any = route.steps[bestIdx]
        remaining += (st0.distance || 0) * (1 - bestT)
        for (let i = bestIdx + 1; i < route.steps.length; i++) remaining += (route.steps[i] as any).distance || 0
        return remaining
    }

    // Start/stop geolocation + dev override
    useEffect(() => {
        if (!route) return
        manualOverride.current = false
        function onPos(pos: GeolocationPosition) {
            if (manualOverride.current) return
            const real: [number, number] = [pos.coords.longitude, pos.coords.latitude]
            // Only propagate if moved more than a tiny threshold (meters)
            try {
                const prev = lastUserRealRef.current
                const moved = prev ? haversine(prev, real) : Infinity
                if (moved < 0.2) return
            } catch { /* ignore */ }
            lastUserRealRef.current = real
            setState(s => ({ ...s, userPosition: real }))
        }
        function onErr() { }
        if (navigator.geolocation) {
            watchId.current = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 })
        }
        const onDevSet = (e: any) => {
            if (!route) return
            try {
                // Stop watch and override manually
                if (watchId.current != null) { try { navigator.geolocation.clearWatch(watchId.current) } catch { } watchId.current = null }
                manualOverride.current = true
                const p = e?.detail as [number, number]
                if (Array.isArray(p) && p.length === 2) {
                    lastUserRealRef.current = [p[0], p[1]]
                    setState(s => ({ ...s, userPosition: [p[0], p[1]] }))
                }
            } catch { }
        }
        window.addEventListener('navigation:dev-set-user-position', onDevSet as any)
        return () => {
            window.removeEventListener('navigation:dev-set-user-position', onDevSet as any)
            if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
        }
    }, [route])

    // Suivi: snap, animation, progression, recalc et fin
    useEffect(() => {
        if (!route || !state.userPosition) return
        const map = mapRefCached.current
        const steps = Array.isArray(route.steps) ? route.steps : []
        if (!steps.length || !map) return
        const { snapped, along, segIndex, segT, realToSnapDist } = snapToRoute(state.userPosition, steps as any)
        if (!snapped) return
        // animer le marqueur jusqu'au point snap si le point a réellement changé (éviter l'animation lors d'un pan de carte)
        try {
            const prevSnap = lastSnappedRef.current
            const delta = prevSnap ? haversine(prevSnap, snapped) : Infinity
            if (!prevSnap || delta >= 0.1) {
                animateMarkerTo(map, snapped)
            }
        } catch {
            animateMarkerTo(map, snapped)
        }
        // progression sur le trait de base et le connecteur (compute ordered chain cache early)
        updateProgress(map, route, along)
        // publier la position/étage du marqueur et appliquer visibilité par niveau
        try {
            const mkLevel: number | null = (() => {
                const s: any = (route.steps && segIndex >= 0 && segIndex < (route.steps as any).length) ? (route.steps as any)[segIndex] : null
                const lv = s && s.level != null ? Number(s.level) : null
                return Number.isFinite(lv as any) ? (lv as number) : null
            })()
            navMarkerLevelRef.current = mkLevel
            try { (map as any).__navMarkerLevel = mkLevel } catch { }
            try { (map as any).__navMarkerCenter = snapped } catch { }
            try { window.dispatchEvent(new CustomEvent('nav:marker-center', { detail: { center: snapped, level: mkLevel } })) } catch { }
            updateMarkerLevelVisibility(map, mkLevel)
        } catch { }
        // orienter la flèche en utilisant la même logique que la coloration (ordered chain)
        try {
            const heading = computeRouteHeading(route, snapped, segIndex, segT)
            if (heading != null) {
                lastHeadingRef.current = heading
                const mk = navMarkerRef.current
                if (mk && (mk as any).setRotation) {
                    try { (mk as any).setRotation(heading) } catch { }
                } else if (mk && (mk as any).getElement) {
                    const mEl = (mk as any).getElement() as HTMLElement
                    mEl.style.transform = `rotate(${heading}deg)`
                }
            }
        } catch { }
        // étape courante approx
        try { setState(s => ({ ...s, currentStep: Math.max(0, segIndex) })) } catch { }
        // recalc si trop loin
        if (realToSnapDist > MAX_SNAP_DISTANCE_METERS) {
            const now = Date.now()
            if (now - lastRecalcAtRef.current > 4000) {
                lastRecalcAtRef.current = now
                try { window.dispatchEvent(new CustomEvent('navigation:recalc-from', { detail: { lng: state.userPosition[0], lat: state.userPosition[1] } })) } catch { }
            }
        }
        // fin si proche de l'arrivée
        const toEnd = distanceToEndFrom(route, snapped)
        if (toEnd <= FINISH_DISTANCE_METERS) {
            try { window.dispatchEvent(new CustomEvent('navigation:finish')) } catch { }
            // Cleanup marker immediately so it doesn't linger
            try { if (navMarkerRef.current) { navMarkerRef.current.remove(); navMarkerRef.current = null } } catch { }
            lastSnappedRef.current = null
            lastHeadingRef.current = null
            navMarkerLevelRef.current = null
            try { delete (map as any).__navMarkerEl; delete (map as any).__navMarkerLevel; delete (map as any).__navMarkerCenter } catch { }
        }
    }, [route, state.userPosition])

    function exit() {
        setState(s => ({ ...s, active: false }))
        // cleanup marker and progress
        try {
            const map = mapRefCached.current
            if (map) {
                const id = 'route-planner-progress-0'
                try { if (map.getLayer && map.getLayer(id + '-line')) map.removeLayer(id + '-line') } catch { }
                try { if (map.getSource && map.getSource(id)) map.removeSource(id) } catch { }
            }
        } catch { }
        try { if (navMarkerRef.current) { navMarkerRef.current.remove(); navMarkerRef.current = null } } catch { }
        if (animReqRef.current) { cancelAnimationFrame(animReqRef.current); animReqRef.current = null }
        lastSnappedRef.current = null
        lastHeadingRef.current = null
        navMarkerLevelRef.current = null
        try { const map = mapRefCached.current; if (map) { delete (map as any).__navMarkerEl; delete (map as any).__navMarkerLevel; delete (map as any).__navMarkerCenter } } catch { }
        onExit()
    }

    return { ...state, exit }
}
