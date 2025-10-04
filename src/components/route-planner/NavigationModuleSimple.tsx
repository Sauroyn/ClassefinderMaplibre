import { useEffect, useState, useRef } from 'react'
import maplibre from 'maplibre-gl'
import type { RouteStep } from './RouteStepsGenerator'

type Route = {
    id: string
    layerId: string
    path: string[]
    cost: number
    distance: number
    time: number
    index?: number
}

type Props = {
    isActive: boolean
    route: Route | null
    steps: RouteStep[]
    mapRef: any
    graph: any
}

export default function NavigationModule({
    isActive,
    route,
    steps,
    mapRef,
    graph
}: Props) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [, setEtaMinutes] = useState<number | null>(null)
    const [, setRemainingDistance] = useState<number | null>(null)
    const [distanceToNextStep, setDistanceToNextStep] = useState<number | null>(null)
    const watchIdRef = useRef<number | null>(null)
    const onRouteMarkerRef = useRef<any>(null)
    const hasCenteredRef = useRef<boolean>(false)
    const devOverrideRef = useRef<boolean>(false)
    const routeCoordsRef = useRef<[number, number][]>([])
    const segmentMetaRef = useRef<Array<{ level?: number | null, levels?: Array<number | string> | null }>>([])
    const progressRef = useRef<number>(0)
    const markerPositionRef = useRef<[number, number] | null>(null)
    const isOnConnectorRef = useRef<boolean>(false)
    const animationFrameRef = useRef<number | null>(null)
    const lastRerouteTimeRef = useRef<number>(0)
    const rerouteCountRef = useRef<number>(0)
    const isSimulatingClickRef = useRef<boolean>(false)
    const finishedRef = useRef<boolean>(false)
    // Itinerary overlays (traveled/remaining) replacing unsupported line-gradient data expressions
    const itinTraveledSrcRef = useRef<string | null>(null)
    const itinRemainingSrcRef = useRef<string | null>(null)
    const itinTraveledLyrRef = useRef<string | null>(null)
    const itinRemainingLyrRef = useRef<string | null>(null)
    const hiddenBaseRef = useRef<boolean>(false)

    // Détection mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

    useEffect(() => {
        if (!isActive || !route || !isMobile) {
            // Cleanup when inactive
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }
            try { onRouteMarkerRef.current?.remove?.(); onRouteMarkerRef.current = null } catch { }

            // Restore default user location display
            try {
                const map = getMap()
                if (map) {
                    const container = map.getContainer()
                    if (container) {
                        const userLocationDots = container.querySelectorAll('.maplibregl-user-location-dot, .mapboxgl-user-location-dot')
                        userLocationDots.forEach((dot: any) => { dot.style.display = 'block' })
                    }
                }
            } catch { }

            hasCenteredRef.current = false
            markerPositionRef.current = null
            isOnConnectorRef.current = false
            devOverrideRef.current = false
            isSimulatingClickRef.current = false
            return
        }

        // Hide default user location during navigation
        try {
            const map = getMap()
            if (map) {
                // Hide geolocate control marker
                const container = map.getContainer()
                if (container) {
                    const userLocationDots = container.querySelectorAll('.maplibregl-user-location-dot, .mapboxgl-user-location-dot')
                    userLocationDots.forEach((dot: any) => { dot.style.display = 'none' })
                }
            }
        } catch { }

        // Get route coordinates (including connector if present)
        const map = getMap()
        if (map && route.layerId) {
            try {
                // Build full coordinates including connector with per-segment levels
                const built = buildFullRouteWithLevels()
                routeCoordsRef.current = built.coords
                segmentMetaRef.current = built.segMeta
                progressRef.current = 0
                // Initialize overlays and first render
                rebuildItineraryOverlays(0)
            } catch (e) {
                console.warn('Error setting up route:', e)
            }
        }

        // Start location tracking
        startLocationTracking()

        // Determine whether simulation features are enabled (strictly dev/local or explicit opt-in)
        const simEnabled = (() => {
            try {
                const isDev = !!(import.meta as any).env?.DEV
                const host = typeof window !== 'undefined' ? window.location.hostname : ''
                const isLocal = host === 'localhost' || host === '127.0.0.1'
                const hasOptIn = typeof window !== 'undefined' && /(?:^|[?&])sim=1(?:&|$)/.test(window.location.search)
                return isDev || isLocal || hasOptIn
            } catch {
                return false
            }
        })()

        // Add map click handler for tests to simulate position (DEV/local only)
        const mapInstance = getMap()
        if (mapInstance && simEnabled) {
            const onMapClick = (e: any) => {
                try {
                    // Activate simulation mode and stop geolocation updates for good
                    if (!isSimulatingClickRef.current) {
                        if ((import.meta as any).env?.DEV) {
                            console.log('Click simulation activated. Geolocation is now ignored.')
                        }
                        isSimulatingClickRef.current = true
                        if (watchIdRef.current !== null) {
                            navigator.geolocation.clearWatch(watchIdRef.current)
                            watchIdRef.current = null
                        }
                    }
                    devOverrideRef.current = true; // Also set this for good measure

                    // Simulate user click by snapping to the closest point on the route
                    const clickCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat]
                    const routeCoords = routeCoordsRef.current
                    if (routeCoords.length > 0) {
                        const projection = projectOntoRoute(clickCoords, routeCoords)
                        const distanceFromRoute = haversineDistance(clickCoords, projection.point)

                        // Only accept clicks reasonably close to the path (<= 100m)
                        if (distanceFromRoute <= 100) {
                            progressRef.current = Math.max(progressRef.current, projection.progress)
                            markerPositionRef.current = projection.point

                            // Ensure marker exists and update its position and orientation
                            ensureMarkerExists(projection.point)
                            animateMarkerTo(projection.point)
                            updateMarkerOrientation(projection.point)
                            updateRouteGradient()
                            updateCurrentStep()

                            // Center on simulated position the first time
                            if (!hasCenteredRef.current) {
                                try { mapInstance?.jumpTo({ center: projection.point, zoom: 18 }) } catch { }
                                hasCenteredRef.current = true
                            }
                        }
                    }
                } catch (err) {
                    console.warn('Error handling map click:', err)
                }
            }
            mapInstance.on('click', onMapClick)

            // Store click handler for cleanup
            return () => {
                try {
                    mapInstance.off('click', onMapClick)
                } catch { }
            }
        }

        // Keep marker orientation in sync with map bearing changes
        const mapForRotation = mapInstance
        const onRotate = () => {
            try {
                const pos = markerPositionRef.current
                if (pos) updateMarkerOrientation(pos)
            } catch { }
        }
        try { mapForRotation?.on?.('rotate', onRotate) } catch { }
        try { mapForRotation?.on?.('move', onRotate) } catch { }

        // Dev/local-only: listen to simulated positions from other tools
        const onDevPos = (e: any) => {
            if (!simEnabled) return
            try {
                const d = e.detail as [number, number]
                const pos = { longitude: d[0], latitude: d[1], accuracy: 5 }
                devOverrideRef.current = true
                if (watchIdRef.current !== null) {
                    navigator.geolocation.clearWatch(watchIdRef.current)
                    watchIdRef.current = null
                }
                // Mark this update as simulation-allowed
                ; (pos as any).__allowSimOverride = true
                updateUserLocationOnMap(pos)
                updateCurrentStep()
            } catch { }
        }
        if (simEnabled) {
            window.addEventListener('dev:fake-position', onDevPos as any)
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }
            // Cleanup itinerary overlays and restore base layers
            try { removeItineraryOverlays(true) } catch { }
            if (simEnabled) {
                try { window.removeEventListener('dev:fake-position', onDevPos as any) } catch { }
            }
            try { mapForRotation?.off?.('rotate', onRotate) } catch { }
            try { mapForRotation?.off?.('move', onRotate) } catch { }
        }
    }, [isActive, route, isMobile])

    const startLocationTracking = () => {
        // Do not start tracking if we are in simulation mode
        if (!navigator.geolocation || devOverrideRef.current || isSimulatingClickRef.current) {
            return
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 2000
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                // Double-check to ignore updates if simulation was activated after starting
                if (isSimulatingClickRef.current) return

                const newPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    heading: position.coords.heading || undefined
                }
                updateUserLocationOnMap(newPosition)
                updateCurrentStep()
            },
            (error) => {
                console.warn('Erreur de géolocalisation:', error)
            },
            options
        )
    }

    const updateUserLocationOnMap = (position: any) => {
        const map = getMap()
        if (!map) return

        // If a simulation click is active, ignore geolocation updates unless explicitly allowed
        if (isSimulatingClickRef.current && !position?.__allowSimOverride) {
            return
        }

        const userCoords: [number, number] = [position.longitude, position.latitude]
        const routeCoords = routeCoordsRef.current

        try {
            // Simple logic: marqueur suit la position GPS de l'utilisateur
            // Pas de projection complexe qui cause des problèmes

            // Project user position onto route line for progress calculation only
            const projection = projectOntoRoute(userCoords, routeCoords)
            const onRouteCoords = projection.point
            const progress = projection.progress

            // Check if user is too far from route with improved logic
            const distanceFromRoute = haversineDistance(userCoords, onRouteCoords)
            const maxDistance = 100 // Distance tolerance from route
            const currentTime = Date.now()

            // Vérifier si l'utilisateur est sur la ligne de connexion (connector line)
            let isOnConnector = false
            try {
                const map = getMap()
                if (map && map.getSource && map.getSource('route-planner-user-connector')) {
                    // Si la ligne de connexion existe, l'utilisateur peut être dessus
                    isOnConnector = true
                    isOnConnectorRef.current = true
                }
            } catch { }

            // Protection contre les boucles infinites de reroute
            // NE PAS rerouter si l'utilisateur est sur la ligne de connexion
            if (distanceFromRoute > maxDistance && markerPositionRef.current && !isOnConnector && !isOnConnectorRef.current) {
                // Éviter le spam : max 1 reroute par 10 secondes et max 3 reroutes au total
                if (currentTime - lastRerouteTimeRef.current > 10000 && rerouteCountRef.current < 3) {
                    console.warn('Triggering reroute: distance =', Math.round(distanceFromRoute), 'm (not on connector)')
                    lastRerouteTimeRef.current = currentTime
                    rerouteCountRef.current += 1
                    const ev = new CustomEvent('route:off', { detail: { distance: distanceFromRoute, coords: userCoords } })
                    window.dispatchEvent(ev)
                }
                return
            }            // Déterminer la position du marqueur : position utilisateur OU position sur la route
            let markerCoords = userCoords

            // Si l'utilisateur est proche de la route (< 50m), placer le marqueur sur la route
            if (distanceFromRoute <= 50) {
                markerCoords = onRouteCoords
                // Reset le compteur de reroute si on revient sur la route
                rerouteCountRef.current = 0
                isOnConnectorRef.current = false
            } else {
                // Sinon, garder le marqueur à la position de l'utilisateur (sur la ligne de connexion)
                markerCoords = userCoords
            }

            // Set marker position
            markerPositionRef.current = markerCoords

            // Update progress for gradient (based on projection)
            if (progress >= progressRef.current) {
                progressRef.current = progress
                // progress updated
            }

            // Create/update marker with determined position and correct orientation
            ensureMarkerExists(markerCoords)
            updateMarkerOrientation(markerCoords)
            animateMarkerTo(markerCoords)
            // Apply floor visibility + auto-switch based on segment level
            try { applyMarkerLevelVisibilityAndAutoSwitch(markerCoords) } catch { }
            // Update itinerary coloring based on progress
            rebuildItineraryOverlays(progressRef.current)

            // Center camera on the active marker position (simulated or real) only once
            if (!hasCenteredRef.current) {
                const centerCoords = (isSimulatingClickRef.current && markerPositionRef.current)
                    ? markerPositionRef.current
                    : userCoords
                try { map.jumpTo({ center: centerCoords as [number, number], zoom: 18 }) } catch { }
                hasCenteredRef.current = true
            }
            // Plus d'easeTo constant qui cause des problèmes de zoom

            // Arrival check
            try { maybeFinishIfArrived(markerCoords) } catch { }

        } catch (error) {
            console.warn('Erreur lors de la mise à jour de la position:', error)
        }
    }

    const getRouteCoordinates = (): [number, number][] => {
        if (!route || !graph) return []

        try {
            const nodeById = new Map<string, any>(graph.nodes.map((n: any) => [String(n.id), n]))
            const coords: [number, number][] = []

            // Get coordinates from route path
            for (const nodeId of route.path) {
                const node = nodeById.get(String(nodeId))
                if (node && node.coord) {
                    coords.push(node.coord as [number, number])
                }
            }

            return coords
        } catch {
            return []
        }
    }

    // connector coords are read directly in buildFullRouteWithLevels

    // Build continuous route with segment level metadata
    const buildFullRouteWithLevels = (): { coords: [number, number][], segMeta: Array<{ level?: number | null, levels?: Array<number | string> | null }> } => {
        const map = getMap()
        const out: [number, number][] = []
        const meta: Array<{ level?: number | null, levels?: Array<number | string> | null }> = []
        const appendSegment = (seg: [number, number][], props?: any) => {
            if (!seg || seg.length < 2) return
            let coords = seg.slice() as [number, number][]
            // Reorient segment to connect from current end
            if (out.length > 0) {
                const last = out[out.length - 1]
                const dStart = haversineDistance(last, coords[0])
                const dEnd = haversineDistance(last, coords[coords.length - 1])
                if (dEnd < dStart) coords = coords.slice().reverse() as any
                // If still not contiguous, do not force-connect by drawing a long straight line; instead, if gap is large, start a new chain
                const dToFirst = haversineDistance(last, coords[0])
                if (dToFirst > 5) {
                    // start a new small connector only if tiny rounding gap; otherwise, push coords as-is starting fresh
                    // Do nothing to out (avoid adding a fake straight segment)
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
            const connSrc: any = map && map.getSource ? map.getSource('route-planner-user-connector') : null
            const connData = connSrc && connSrc._data
            if (connData && connData.features && connData.features.length) {
                const f = connData.features[0]
                if (f && f.geometry && f.geometry.type === 'LineString') appendSegment(f.geometry.coordinates as any, f.properties || {})
            }
        } catch { }
        try {
            const src: any = map && route ? map.getSource(route.id) : null
            const data = src && src._data
            if (data && Array.isArray(data.features)) {
                for (const f of data.features) {
                    if (!f || !f.geometry || f.geometry.type !== 'LineString') continue
                    appendSegment(f.geometry.coordinates as any, f.properties || {})
                }
            } else {
                const coords = getRouteCoordinates()
                for (let i = 0; i < coords.length - 1; i++) appendSegment([coords[i], coords[i + 1]], {})
            }
        } catch { }
        // compact duplicates
        const compact: [number, number][] = []
        for (const c of out) {
            if (!compact.length) { compact.push(c); continue }
            const last = compact[compact.length - 1]
            if (last[0] === c[0] && last[1] === c[1]) continue
            compact.push(c)
        }
        return { coords: compact.length ? compact : out, segMeta: meta }
    }

    const normalizeMaybeNumber = (v: any): number | null => {
        if (v === null || v === undefined) return null
        const n = Number(v)
        return Number.isFinite(n) ? n : null
    }
    const normalizeMaybeLevels = (arr: any): Array<number | string> | null => {
        if (!arr || !Array.isArray(arr)) return null
        return arr.map((x: any) => { const n = Number(x); return Number.isFinite(n) ? n : String(x) })
    }

    const projectOntoRoute = (userCoords: [number, number], routeCoords: [number, number][]): { point: [number, number], progress: number } => {
        const det = projectOntoRouteDetailed(userCoords, routeCoords)
        return { point: det.point, progress: det.progress }
    }

    // Detailed projection: also return segment index and local parameter t within segment
    const projectOntoRouteDetailed = (userCoords: [number, number], routeCoords: [number, number][]): { point: [number, number], progress: number, segIndex: number, t: number } => {
        if (routeCoords.length < 2) {
            return { point: userCoords, progress: 0, segIndex: 0, t: 0 }
        }

        let closestPoint = routeCoords[0]
        let minDistance = Infinity
        let totalDistance = 0
        let reachedDistance = 0
        let bestSegIndex = 0
        let bestT = 0

        // Calculate total route distance
        for (let i = 0; i < routeCoords.length - 1; i++) {
            totalDistance += haversineDistance(routeCoords[i], routeCoords[i + 1])
        }

        // Find closest point on route
        let currentDistance = 0
        for (let i = 0; i < routeCoords.length - 1; i++) {
            const segmentStart = routeCoords[i]
            const segmentEnd = routeCoords[i + 1]
            const { point: projected, t } = projectPointOnSegmentWithT(userCoords, segmentStart, segmentEnd)
            const distance = haversineDistance(userCoords, projected)

            if (distance < minDistance) {
                minDistance = distance
                closestPoint = projected
                reachedDistance = currentDistance + haversineDistance(segmentStart, projected)
                bestSegIndex = i
                bestT = t
            }

            currentDistance += haversineDistance(segmentStart, segmentEnd)
        }

        const progress = totalDistance > 0 ? Math.min(1, reachedDistance / totalDistance) : 0
        return { point: closestPoint, progress, segIndex: bestSegIndex, t: bestT }
    }

    // (legacy helper removed; use projectPointOnSegmentWithT)

    const projectPointOnSegmentWithT = (point: [number, number], segStart: [number, number], segEnd: [number, number]): { point: [number, number], t: number } => {
        const A = point[0] - segStart[0]
        const B = point[1] - segStart[1]
        const C = segEnd[0] - segStart[0]
        const D = segEnd[1] - segStart[1]

        const dot = A * C + B * D
        const lenSq = C * C + D * D
        if (lenSq === 0) return { point: segStart, t: 0 }
        let param = dot / lenSq
        if (param < 0) return { point: segStart, t: 0 }
        if (param > 1) return { point: segEnd, t: 1 }
        return { point: [segStart[0] + param * C, segStart[1] + param * D], t: param }
    }

    // (bearing helpers removed; orientation now computed in screen space)

    // Crée le marqueur si besoin
    const ensureMarkerExists = (coords: [number, number]) => {
        const map = getMap()
        if (!map) return
        if (!onRouteMarkerRef.current) {
            // Outer container (MapLibre will apply translate transforms here for positioning)
            const el = document.createElement('div')
            el.style.width = '28px'
            el.style.height = '28px'
            el.style.display = 'flex'
            el.style.alignItems = 'center'
            el.style.justifyContent = 'center'
            el.style.pointerEvents = 'none'

            // Inner rotatable container for the arrow (we'll rotate this, not the outer element)
            const rot = document.createElement('div')
            rot.className = 'nav-arrow-rot'
            rot.style.width = '24px'
            rot.style.height = '24px'
            rot.style.display = 'flex'
            rot.style.alignItems = 'center'
            rot.style.justifyContent = 'center'
            rot.style.transformOrigin = '50% 50%'
            rot.style.willChange = 'transform'

            // SVG arrow pointing UP by default
            const svgNS = 'http://www.w3.org/2000/svg'
            const svg = document.createElementNS(svgNS, 'svg')
            svg.setAttribute('width', '24')
            svg.setAttribute('height', '24')
            svg.setAttribute('viewBox', '0 0 24 24')
            svg.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'

            const path = document.createElementNS(svgNS, 'path')
            // Simple arrow (triangle) pointing up
            path.setAttribute('d', 'M12 2 L20 18 L12 14 L4 18 Z')
            path.setAttribute('fill', '#007AFF')
            svg.appendChild(path)
            rot.appendChild(svg)
            el.appendChild(rot)

            onRouteMarkerRef.current = new maplibre.Marker({ element: el, anchor: 'center' })
                .setLngLat(coords)
                .addTo(map)
        }
    }

    // Met à jour l'orientation du marqueur selon la direction locale, en espace écran
    const updateMarkerOrientation = (coords: [number, number]) => {
        const routeCoords = routeCoordsRef.current
        if (!onRouteMarkerRef.current || routeCoords.length < 2) return

        const map = getMap()
        if (!map || !map.project) return

        // Projection détaillée pour trouver le segment et avancer légèrement dans la direction du tracé
        const det = projectOntoRouteDetailed(coords, routeCoords)
        const pBehind = getPointBehindOnPolyline(routeCoords, det.segIndex, det.t, 8) || det.point
        const pAhead = getPointAheadOnPolyline(routeCoords, det.segIndex, det.t, 8) || routeCoords[Math.min(det.segIndex + 1, routeCoords.length - 1)]

        // Calculer l'angle en espace écran du vecteur pBehind -> pAhead (y vers le bas). 0° = vers le haut.
        const s0 = map.project({ lng: pBehind[0], lat: pBehind[1] })
        const s1 = map.project({ lng: pAhead[0], lat: pAhead[1] })
        const dx = s1.x - s0.x
        const dy = s1.y - s0.y
        // Robust screen-space orientation: angle of vector (dx, dy), then rotate +90° so 0° means arrow up
        let angleDeg = (Math.atan2(dy, dx) * 180 / Math.PI) + 90
        if (angleDeg < 0) angleDeg += 360
        const rotation = angleDeg % 360
        const el = onRouteMarkerRef.current.getElement()
        const rotEl = el?.querySelector?.('.nav-arrow-rot') as HTMLElement | null
        if (rotEl) {
            rotEl.style.transform = `rotate(${rotation}deg)`
        }
    }

    // Avance d'une distance en mètres le long de la polyligne à partir d'un point (segment index + t)
    const getPointAheadOnPolyline = (coords: [number, number][], segIndex: number, t: number, distanceMeters: number): [number, number] | null => {
        let i = segIndex
        let localT = t
        let remaining = distanceMeters
        // avancer sur le segment courant
        const advanceOnSegment = (a: [number, number], b: [number, number], fromT: number, dist: number): { point: [number, number], used: number } => {
            const segLen = haversineDistance(a, b)
            const remLen = segLen * (1 - fromT)
            if (remLen <= 1e-6) return { point: b, used: 0 }
            const use = Math.min(remLen, dist)
            const dt = (use / segLen)
            const newT = Math.min(1, fromT + dt)
            const p: [number, number] = [a[0] + (b[0] - a[0]) * newT, a[1] + (b[1] - a[1]) * newT]
            return { point: p, used: use }
        }
        let a = coords[i]
        let b = coords[i + 1]
        if (!a || !b) return null
        // point de départ exact
        const start: [number, number] = [a[0] + (b[0] - a[0]) * localT, a[1] + (b[1] - a[1]) * localT]
        let currentPoint = start
        let remainingToUse = remaining
        // avancer tant qu'il reste
        while (remainingToUse > 0 && i < coords.length - 1) {
            a = coords[i]
            b = coords[i + 1]
            const { point, used } = advanceOnSegment(a, b, localT, remainingToUse)
            currentPoint = point
            remainingToUse -= used
            if (localT + (used / Math.max(1e-6, haversineDistance(a, b))) >= 1 - 1e-9) {
                // passer au segment suivant
                i += 1
                localT = 0
            } else {
                // assez avancé sur le segment courant
                break
            }
        }
        return currentPoint
    }

    // Recule d'une distance en mètres le long de la polyligne (utile pour orienter la flèche)
    const getPointBehindOnPolyline = (coords: [number, number][], segIndex: number, t: number, distanceMeters: number): [number, number] | null => {
        let i = segIndex
        let localT = t
        let remaining = distanceMeters
        const retreatOnSegment = (a: [number, number], b: [number, number], toT: number, dist: number): { point: [number, number], used: number } => {
            const segLen = haversineDistance(a, b)
            const used = Math.min(segLen * toT, dist)
            const newT = Math.max(0, toT - (used / Math.max(1e-6, segLen)))
            const p: [number, number] = [a[0] + (b[0] - a[0]) * newT, a[1] + (b[1] - a[1]) * newT]
            return { point: p, used }
        }
        let a = coords[i]
        let b = coords[i + 1]
        if (!a || !b) return null
        // point de départ exact
        const start: [number, number] = [a[0] + (b[0] - a[0]) * localT, a[1] + (b[1] - a[1]) * localT]
        let currentPoint = start
        let remainingToUse = remaining
        while (remainingToUse > 0 && i >= 0) {
            a = coords[i]
            b = coords[i + 1]
            const { point, used } = retreatOnSegment(a, b, localT, remainingToUse)
            currentPoint = point
            remainingToUse -= used
            if (localT - (used / Math.max(1e-6, haversineDistance(a, b))) <= 1e-9) {
                // passer au segment précédent
                i -= 1
                if (i < 0) break
                localT = 1
            } else {
                break
            }
        }
        return currentPoint
    }

    const updateRouteGradient = () => {
        const map = getMap()
        if (!map || !route) return
        // Calculate progress based on user's position on route and rebuild overlays
        try {
            const userCoords = markerPositionRef.current
            if (!userCoords) return
            const routeCoords = routeCoordsRef.current.length ? routeCoordsRef.current : buildFullRouteWithLevels().coords
            const projection = projectOntoRoute(userCoords, routeCoords)
            const actualProgress = Math.max(0, Math.min(1, projection.progress))
            rebuildItineraryOverlays(actualProgress)
        } catch (e) {
            console.warn('Error updating itinerary coloring:', e)
        }
    }

    // Remove unused function

    const animateMarkerTo = (targetCoords: [number, number]) => {
        if (!onRouteMarkerRef.current) return

        const currentLngLat = onRouteMarkerRef.current.getLngLat()
        const currentCoords: [number, number] = [currentLngLat.lng, currentLngLat.lat]

        // Calculate distance to see if animation is needed
        const distance = haversineDistance(currentCoords, targetCoords)
        if (distance < 1) {
            // Too small to animate, just set position
            onRouteMarkerRef.current.setLngLat(targetCoords)
            return
        }

        // Cancel any existing animation
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current)
        }

        // Animate smoothly over 300ms
        const startTime = Date.now()
        const duration = 300

        const animate = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)

            // Easing function for smooth animation
            const eased = 1 - Math.pow(1 - progress, 3)

            const currentLng = currentCoords[0] + (targetCoords[0] - currentCoords[0]) * eased
            const currentLat = currentCoords[1] + (targetCoords[1] - currentCoords[1]) * eased

            onRouteMarkerRef.current?.setLngLat([currentLng, currentLat])
            try { updateMarkerOrientation([currentLng, currentLat]) } catch { }

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate)
            } else {
                animationFrameRef.current = null
            }
        }

        animationFrameRef.current = requestAnimationFrame(animate)
    }

    const updateCurrentStep = () => {
        if (!steps || steps.length === 0) return

        // Use actual marker position (which is now user's real GPS position)
        const userCoords = markerPositionRef.current
        if (!userCoords) return

        // Check if user is close to next step
        for (let i = currentStepIndex; i < steps.length; i++) {
            const step = steps[i]
            if (step.coordinates && step.coordinates[0]) {
                const stepCoords = step.coordinates[0] as [number, number]
                const distance = haversineDistance(userCoords, stepCoords)

                if (distance <= 30) { // 30 meters tolerance for user position
                    setCurrentStepIndex(i)
                    break
                }
            }
        }

        // Calculate distance to next step from user position
        const nextStep = steps[currentStepIndex + 1]
        if (nextStep && nextStep.coordinates && nextStep.coordinates[0]) {
            const nextStepCoords = nextStep.coordinates[0] as [number, number]
            const distance = haversineDistance(userCoords, nextStepCoords)
            setDistanceToNextStep(Math.round(distance))
        } else {
            setDistanceToNextStep(null)
        }

        // Calculate remaining distance based on progress over the full polyline
        const routeCoords = routeCoordsRef.current.length ? routeCoordsRef.current : buildFullRouteWithLevels().coords
        let totalRouteDistance = 0
        if (routeCoords.length > 1) {
            for (let i = 0; i < routeCoords.length - 1; i++) {
                totalRouteDistance += haversineDistance(routeCoords[i], routeCoords[i + 1])
            }
        }

        const remainingDist = Math.max(0, (1 - progressRef.current) * totalRouteDistance)
        setRemainingDistance(remainingDist)

        const walkingSpeed = 1.2 // m/s
        const eta = Math.round(remainingDist / walkingSpeed / 60)
        setEtaMinutes(eta)

        // Emit navigation state
        try {
            window.dispatchEvent(new CustomEvent('nav:state', {
                detail: {
                    currentStepIndex,
                    etaMinutes: eta,
                    remainingDistance: remainingDist,
                    distanceToNextStep
                }
            }))
        } catch { }
    }

    const getMap = () => {
        return mapRef && mapRef.current && (
            mapRef.current.getMap ? mapRef.current.getMap() :
                (mapRef.current.map ? mapRef.current.map : mapRef.current)
        )
    }

    // Floor visibility and auto switching
    const applyMarkerLevelVisibilityAndAutoSwitch = (coords: [number, number]) => {
        const map = getMap()
        if (!map) return
        const rc = routeCoordsRef.current
        const sm = segmentMetaRef.current
        if (!rc.length || !sm.length) return
        const det = projectOntoRouteDetailed(coords, rc)
        const meta = sm[Math.min(det.segIndex, sm.length - 1)] || {}
        const current: number = (map as any).__currentLevel ?? 0
        const active = chooseActiveLevel(meta, current)
        const el = onRouteMarkerRef.current?.getElement?.()
        if (active != null) {
            if (el) el.style.display = (active === current) ? 'block' : 'none'
            if (active !== current) setCurrentLevel(map, active)
        } else {
            if (el) el.style.display = 'block'
        }
    }

    const chooseActiveLevel = (meta: { level?: number | null, levels?: Array<number | string> | null }, currentLevel: number): number | null => {
        const cands: number[] = []
        if (meta.level != null) { const n = Number(meta.level); if (!Number.isNaN(n)) cands.push(n) }
        if (meta.levels && Array.isArray(meta.levels)) { for (const v of meta.levels) { const n = Number(v); if (!Number.isNaN(n)) cands.push(n) } }
        if (cands.length === 0) return null
        if (cands.includes(currentLevel)) return currentLevel
        return cands[0]
    }

    const setCurrentLevel = (map: any, level: number) => {
        try { (map as any).__currentLevel = level } catch { }
        const filter = ['==', ['get', 'level'], level]
        try { if (map.getLayer('buildings-extrusion')) map.setFilter('buildings-extrusion', filter as any) } catch { }
        try { if (map.getLayer('buildings-fill')) map.setFilter('buildings-fill', filter as any) } catch { }
        try { if (map.getLayer('buildings-name')) map.setFilter('buildings-name', filter as any) } catch { }
        try {
            const style = map.getStyle && map.getStyle()
            const layers = (style && style.layers) || []
            const routeFilter: any = [
                'any',
                ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
                ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]],
                ['all', ['!', ['has', 'level']], ['!', ['has', 'levels']]]
            ]
            for (const lyr of layers) if (lyr && typeof lyr.id === 'string' && lyr.id.startsWith('route-planner-')) { try { map.setFilter(lyr.id, routeFilter) } catch { } }
        } catch { }
        try { window.dispatchEvent(new CustomEvent('level:auto', { detail: level })) } catch { }
    }

    const maybeFinishIfArrived = (coords: [number, number]) => {
        if (finishedRef.current) return
        const rc = routeCoordsRef.current
        if (!rc || rc.length === 0) return
        const last = rc[rc.length - 1]
        const d = haversineDistance(coords, last)
        if (d <= 15) {
            finishedRef.current = true
            try { window.dispatchEvent(new CustomEvent('nav:finish')) } catch { }
        }
    }

    // Build overlays for traveled/remaining parts of connector + route, preserving level/levels
    const rebuildItineraryOverlays = (progress: number) => {
        const map = getMap()
        if (!map || !route) return
        const conn = getConnectorFeature(map)
        const feats = getRouteFeatures(map, route.id)
        if (!feats) return

        const lenOf = (coords: [number, number][]) => {
            let s = 0
            for (let i = 1; i < coords.length; i++) s += haversineDistance(coords[i - 1], coords[i])
            return s
        }
        let total = 0
        const featList: Array<{ coords: [number, number][], props: any }> = []
        if (conn && conn.geometry?.type === 'LineString') {
            const c = conn.geometry.coordinates as [number, number][]
            total += lenOf(c)
            featList.push({ coords: c, props: conn.properties || {} })
        }
        for (const f of feats) {
            if (f.geometry?.type === 'LineString') {
                const c = f.geometry.coordinates as [number, number][]
                total += lenOf(c)
                featList.push({ coords: c, props: f.properties || {} })
            }
        }
        if (total <= 0) return
        const cut = Math.max(0, Math.min(1, progress)) * total

        const traveled: any[] = []
        const remaining: any[] = []
        let acc = 0
        for (const item of featList) {
            const L = lenOf(item.coords)
            const start = acc
            const end = acc + L
            if (cut <= start + 1e-6) {
                // entirely remaining
                remaining.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: item.coords }, properties: { ...item.props } })
            } else if (cut >= end - 1e-6) {
                // entirely traveled
                traveled.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: item.coords }, properties: { ...item.props } })
            } else {
                // split within this feature
                const within = cut - start
                const [pre, post] = splitLineStringByDistance(item.coords, within)
                if (pre.length >= 2) traveled.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: pre }, properties: { ...item.props } })
                if (post.length >= 2) remaining.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: post }, properties: { ...item.props } })
            }
            acc = end
        }

        const srcTr = itinTraveledSrcRef.current || `itinerary-${route.id}-traveled`
        const srcRm = itinRemainingSrcRef.current || `itinerary-${route.id}-remaining`
        const lyrTr = itinTraveledLyrRef.current || `itinerary-${route.id}-traveled-line`
        const lyrRm = itinRemainingLyrRef.current || `itinerary-${route.id}-remaining-line`
        itinTraveledSrcRef.current = srcTr
        itinRemainingSrcRef.current = srcRm
        itinTraveledLyrRef.current = lyrTr
        itinRemainingLyrRef.current = lyrRm

        const fcTr = { type: 'FeatureCollection', features: traveled }
        const fcRm = { type: 'FeatureCollection', features: remaining }
        try {
            if (map.getSource && map.getSource(srcTr)) (map.getSource(srcTr) as any).setData(fcTr)
            else if (map.addSource) map.addSource(srcTr, { type: 'geojson', data: fcTr })
        } catch { }
        try {
            if (map.getSource && map.getSource(srcRm)) (map.getSource(srcRm) as any).setData(fcRm)
            else if (map.addSource) map.addSource(srcRm, { type: 'geojson', data: fcRm })
        } catch { }

        // Route filter per current level
        const mapAny = map as any
        const level = mapAny.__currentLevel ?? null
        const routeFilter: any = level == null ? true : [
            'any',
            ['all', ['has', 'level'], ['==', ['get', 'level'], level]],
            ['all', ['has', 'levels'], ['in', level, ['get', 'levels']]],
            ['all', ['!', ['has', 'level']], ['!', ['has', 'levels']]]
        ]

        // Layers
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

        // Ensure overlays above original selected route
        try { if (map.moveLayer && route.layerId && map.getLayer(route.layerId)) map.moveLayer(lyrRm, route.layerId) } catch { }
        try { if (map.moveLayer && route.layerId && map.getLayer(route.layerId)) map.moveLayer(lyrTr, lyrRm) } catch { }

        // Hide base layers to avoid double drawing
        if (!hiddenBaseRef.current) {
            try { if (route.layerId && map.getLayer && map.getLayer(route.layerId)) map.setPaintProperty(route.layerId, 'line-opacity', 0) } catch { }
            try { if (map.getLayer && map.getLayer('route-planner-user-connector-line')) map.setPaintProperty('route-planner-user-connector-line', 'line-opacity', 0) } catch { }
            hiddenBaseRef.current = true
        }
    }

    const removeItineraryOverlays = (restoreBase: boolean) => {
        const map = getMap()
        if (!map) return
        try {
            const lyrTr = itinTraveledLyrRef.current
            const lyrRm = itinRemainingLyrRef.current
            const srcTr = itinTraveledSrcRef.current
            const srcRm = itinRemainingSrcRef.current
            if (lyrTr && map.getLayer && map.getLayer(lyrTr)) map.removeLayer(lyrTr)
            if (lyrRm && map.getLayer && map.getLayer(lyrRm)) map.removeLayer(lyrRm)
            if (srcTr && map.getSource && map.getSource(srcTr)) map.removeSource(srcTr)
            if (srcRm && map.getSource && map.getSource(srcRm)) map.removeSource(srcRm)
        } catch { }
        itinTraveledLyrRef.current = null
        itinRemainingLyrRef.current = null
        itinTraveledSrcRef.current = null
        itinRemainingSrcRef.current = null
        if (restoreBase) {
            try { if (route && route.layerId && map.getLayer && map.getLayer(route.layerId)) map.setPaintProperty(route.layerId, 'line-opacity', 1) } catch { }
            try { if (map.getLayer && map.getLayer('route-planner-user-connector-line')) map.setPaintProperty('route-planner-user-connector-line', 'line-opacity', 0.55) } catch { }
            hiddenBaseRef.current = false
        }
    }

    const getConnectorFeature = (map: any): any | null => {
        try {
            const src: any = map.getSource && map.getSource('route-planner-user-connector')
            const d = src ? src._data : null
            if (d && d.features && d.features[0]) return d.features[0]
        } catch { }
        return null
    }

    const getRouteFeatures = (map: any, srcId: string): any[] | null => {
        try {
            const src: any = map.getSource && map.getSource(srcId)
            const d = src ? src._data : null
            if (d && Array.isArray(d.features)) return d.features
        } catch { }
        return null
    }

    const splitLineStringByDistance = (coords: [number, number][], cutMeters: number): [[number, number][], [number, number][]] => {
        if (!coords || coords.length < 2 || cutMeters <= 0) return [[], coords.slice()]
        let acc = 0
        for (let i = 0; i < coords.length - 1; i++) {
            const a = coords[i]
            const b = coords[i + 1]
            const seg = haversineDistance(a, b)
            if (acc + seg < cutMeters) {
                acc += seg
                continue
            }
            const remain = cutMeters - acc
            const t = Math.max(0, Math.min(1, remain / Math.max(1e-6, seg)))
            const mid: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
            const pre = coords.slice(0, i + 1)
            pre.push(mid)
            const post = [mid, ...coords.slice(i + 1)]
            return [pre, post]
        }
        return [coords.slice(), []]
    }


    return null
}

// Utility functions
function haversineDistance(from: [number, number], to: [number, number]): number {
    const R = 6371000 // Earth radius in meters
    const dLat = (to[1] - from[1]) * Math.PI / 180
    const dLon = (to[0] - from[0]) * Math.PI / 180
    const lat1 = from[1] * Math.PI / 180
    const lat2 = to[1] * Math.PI / 180

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
}