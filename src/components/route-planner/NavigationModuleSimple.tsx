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
    const progressRef = useRef<number>(0)
    const markerPositionRef = useRef<[number, number] | null>(null)
    const isOnConnectorRef = useRef<boolean>(false)
    const animationFrameRef = useRef<number | null>(null)
    const lastRerouteTimeRef = useRef<number>(0)
    const rerouteCountRef = useRef<number>(0)
    const isSimulatingClickRef = useRef<boolean>(false)

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

        // Get route coordinates (including connector if present) and setup gradient
        const map = getMap()
        if (map && route.layerId) {
            try {
                // Build full coordinates including connector segment (user -> first graph node) when present
                const coords = getFullRouteCoordinates()
                routeCoordsRef.current = coords
                progressRef.current = 0

                // Setup route layer with lineMetrics for gradient
                if (map.getLayer && map.getLayer(route.layerId)) {
                    // Add lineMetrics to the source
                    const source = map.getSource(route.id)
                    if (source && source.setData) {
                        const data = source._data
                        if (data && data.features) {
                            // Update source with lineMetrics
                            map.removeLayer(route.layerId)
                            map.removeSource(route.id)
                            map.addSource(route.id, {
                                type: 'geojson',
                                data: data,
                                lineMetrics: true
                            })
                            map.addLayer({
                                id: route.layerId,
                                type: 'line',
                                source: route.id,
                                paint: {
                                    'line-color': '#007AFF',
                                    'line-width': 8,
                                    'line-opacity': 1
                                },
                                layout: {
                                    'line-cap': 'round',
                                    'line-join': 'round'
                                }
                            })
                        }
                    }
                }
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
                console.log('Progress updated to:', progress)
            }

            // Create/update marker with determined position and correct orientation
            ensureMarkerExists(markerCoords)
            updateMarkerOrientation(markerCoords)
            animateMarkerTo(markerCoords)
            // Update route color gradient based on progress
            updateRouteGradient()

            // Center camera on the active marker position (simulated or real) only once
            if (!hasCenteredRef.current) {
                const centerCoords = (isSimulatingClickRef.current && markerPositionRef.current)
                    ? markerPositionRef.current
                    : userCoords
                try { map.jumpTo({ center: centerCoords as [number, number], zoom: 18 }) } catch { }
                hasCenteredRef.current = true
            }
            // Plus d'easeTo constant qui cause des problèmes de zoom

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

    // Retrieve the connector line coordinates if drawn (user origin -> nearest graph node)
    const getConnectorCoordinates = (): [number, number][] => {
        try {
            const map = getMap()
            const src: any = map && map.getSource ? map.getSource('route-planner-user-connector') : null
            const data = src && src._data
            if (data && data.features && data.features.length) {
                const f = data.features[0]
                if (f && f.geometry && f.geometry.type === 'LineString' && Array.isArray(f.geometry.coordinates)) {
                    return (f.geometry.coordinates as [number, number][])
                }
            }
        } catch { }
        return []
    }

    // Combine connector + graph path into a single continuous polyline
    const getFullRouteCoordinates = (): [number, number][] => {
        const graphCoords = getRouteCoordinates()
        const connector = getConnectorCoordinates()
        if (!connector.length) return graphCoords
        if (!graphCoords.length) return connector

        const startOfGraph = graphCoords[0]
        const endOfConnector = connector[connector.length - 1]
        const d = haversineDistance(startOfGraph, endOfConnector)
        if (d < 1e-3) {
            // Same point (or extremely close): merge without duplication
            return [...connector.slice(0, connector.length - 1), ...graphCoords]
        }
        // Otherwise just concatenate (best-effort)
        return [...connector, ...graphCoords]
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
        const p0 = det.point
        const p1 = getPointAheadOnPolyline(routeCoords, det.segIndex, det.t, 8) || routeCoords[Math.min(det.segIndex + 1, routeCoords.length - 1)]

        // Calculer l'angle en espace écran (y vers le bas). 0° = vers le haut.
        const s0 = map.project({ lng: p0[0], lat: p0[1] })
        const s1 = map.project({ lng: p1[0], lat: p1[1] })
        const dx = s1.x - s0.x
        const dy = s1.y - s0.y
        const angleRad = Math.atan2(dx, -dy)
        const rotation = (angleRad * 180 / Math.PI + 360) % 360
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

    const updateRouteGradient = () => {
        const map = getMap()
        if (!map || !route) return

        try {
            if (map.getLayer && map.getLayer(route.layerId)) {
                // Calculate progress based on user's position on route
                const userCoords = markerPositionRef.current
                if (!userCoords) return

                // Always use the full polyline (connector + graph)
                const routeCoords = routeCoordsRef.current.length ? routeCoordsRef.current : getFullRouteCoordinates()
                const projection = projectOntoRoute(userCoords, routeCoords)
                const actualProgress = Math.max(0, Math.min(1, projection.progress))

                // SOLUTION: Créer une LineString continue pour que le gradient fonctionne sur toute la ligne
                const source = map.getSource(route.id)
                if (source && source._data) {
                    // Créer une seule LineString continue avec tous les points de la route
                    const continuousLineData = {
                        type: 'FeatureCollection',
                        features: [{
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: routeCoords
                            },
                            properties: {}
                        }]
                    }

                    // Recréer la source avec la LineString continue et lineMetrics
                    map.removeLayer(route.layerId)
                    map.removeSource(route.id)
                    map.addSource(route.id, {
                        type: 'geojson',
                        data: continuousLineData,
                        lineMetrics: true
                    })
                    map.addLayer({
                        id: route.layerId,
                        type: 'line',
                        source: route.id,
                        paint: {
                            'line-width': 8,
                            'line-opacity': 1
                        },
                        layout: {
                            'line-cap': 'round',
                            'line-join': 'round'
                        }
                    })
                }

                // Hard step: grey up to progress, blue after
                map.setPaintProperty(route.layerId, 'line-gradient', [
                    'step',
                    ['line-progress'],
                    '#9aa0a6',
                    actualProgress,
                    '#007AFF'
                ])
            }
        } catch (e) {
            console.warn('Error updating gradient:', e)
            // Fallback: solid blue color
            try {
                map.setPaintProperty(route.layerId, 'line-color', '#007AFF')
            } catch { }
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
        const routeCoords = routeCoordsRef.current.length ? routeCoordsRef.current : getFullRouteCoordinates()
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