import { useEffect, useRef, useState } from 'react'
import maplibre from 'maplibre-gl'
import type { RouteItem } from './MobileSheets'
import { haversine } from '../../map/measure'

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
    const lastSnappedRef = useRef<[number, number] | null>(null)
    const animReqRef = useRef<number | null>(null)
    const lastRecalcAtRef = useRef<number>(0)

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
        el.style.width = '22px'
        el.style.height = '22px'
        el.style.borderRadius = '50%'
        el.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.3)'
        el.style.background = '#007bff'
        el.style.transition = 'transform 0.15s ease-out'
        // Important: set initial position before adding to the map to avoid internal null lngLat errors
        const mk = new maplibre.Marker({ element: el, rotationAlignment: 'map' as any, pitchAlignment: 'map' as any })
        try { mk.setLngLat(initialLngLat) } catch { }
        try { navMarkerRef.current = mk.addTo(map) } catch { navMarkerRef.current = mk }
        return mk
    }

    function updateProgressLayer(map: any, route: RouteItem, along: number, segIndex: number, segT: number) {
        try {
            const id = 'route-planner-progress-0'
            const layerId = id + '-line'
            // construire les features jusqu'au point courant
            const feats: any[] = []
            let remaining = along
            if (route.steps && route.steps.length) {
                for (let i = 0; i < route.steps.length; i++) {
                    const st: any = route.steps[i]
                    const a = st.coords[0]
                    const b = st.coords[1]
                    if (remaining <= 0) break
                    if (i < segIndex) {
                        feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [a, b] }, properties: { level: st.level } })
                        remaining -= (st.distance || 0)
                    } else if (i === segIndex) {
                        // ajouter segment partiel [a -> p]
                        // calcule point p par interpolation linéaire en WGS (approx)
                        const p: [number, number] = [
                            (a[0] as number) + ((b[0] as number) - (a[0] as number)) * segT,
                            (a[1] as number) + ((b[1] as number) - (a[1] as number)) * segT,
                        ]
                        feats.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [a, p] }, properties: { level: st.level } })
                        remaining = 0
                        break
                    }
                }
            }
            const fc = { type: 'FeatureCollection', features: feats }
            if (map.getSource && map.getSource(id)) (map.getSource(id) as any).setData(fc)
            else map.addSource(id, { type: 'geojson', data: fc })
            const paint = { 'line-color': '#9aa0a6', 'line-width': 18, 'line-opacity': 1 }
            if (!map.getLayer || !map.getLayer(layerId)) {
                map.addLayer({ id: layerId, type: 'line', source: id, paint, layout: { 'line-cap': 'round', 'line-join': 'round' } })
                try { map.moveLayer(layerId) } catch { }
            } else {
                map.setPaintProperty(layerId, 'line-color', '#9aa0a6')
                map.setPaintProperty(layerId, 'line-width', 18)
                map.setPaintProperty(layerId, 'line-opacity', 1)
            }
        } catch { }
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
                if (Array.isArray(p) && p.length === 2) setState(s => ({ ...s, userPosition: [p[0], p[1]] }))
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
        // animer le marqueur jusqu'au point snap
        animateMarkerTo(map, snapped)
        // progression grisée
        updateProgressLayer(map, route, along, segIndex, segT)
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
        onExit()
    }

    return { ...state, exit }
}
