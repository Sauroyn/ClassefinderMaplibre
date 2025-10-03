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

        // Get route coordinates and setup gradient
        const map = getMap()
        if (map && route.layerId) {
            try {
                // Get route coordinates from graph
                const coords = getRouteCoordinates()
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

        // Add map click handler for connector line clicks
        const mapInstance = getMap()
        if (mapInstance) {
            const onMapClick = (e: any) => {
                try {
                    // Check if click is on connector line area
                    const clickCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat]
                    const routeCoords = routeCoordsRef.current
                    if (routeCoords.length > 0) {
                        // Project click onto route
                        const projection = projectOntoRoute(clickCoords, routeCoords)
                        const distanceFromRoute = haversineDistance(clickCoords, projection.point)

                        // If click is reasonably close to route (within 100m), move marker there
                        if (distanceFromRoute <= 100) {
                            // Update progress and marker position
                            progressRef.current = Math.max(progressRef.current, projection.progress)
                            markerPositionRef.current = projection.point

                            // Animate marker to new position
                            animateMarkerTo(projection.point)
                            updateRouteGradient()
                            updateCurrentStep()
                        }
                    }
                } catch (e) {
                    console.warn('Error handling map click:', e)
                }
            }
            mapInstance.on('click', onMapClick)

            // Store click handler for cleanup
            const cleanup = () => {
                try {
                    mapInstance.off('click', onMapClick)
                } catch { }
            }
            return cleanup
        }

        // Dev-only: listen to simulated positions
        const onDevPos = (e: any) => {
            try {
                const d = e.detail as [number, number]
                const pos = { longitude: d[0], latitude: d[1], accuracy: 5 }
                devOverrideRef.current = true
                if (watchIdRef.current !== null) {
                    try { navigator.geolocation.clearWatch(watchIdRef.current) } catch { }
                    watchIdRef.current = null
                }
                updateUserLocationOnMap(pos)
                updateCurrentStep()
            } catch { }
        }
        try { if (import.meta.env && import.meta.env.DEV) window.addEventListener('dev:fake-position', onDevPos as any) } catch { }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }
            try { if (import.meta.env && import.meta.env.DEV) window.removeEventListener('dev:fake-position', onDevPos as any) } catch { }
        }
    }, [isActive, route, isMobile])

    const startLocationTracking = () => {
        if (!navigator.geolocation || devOverrideRef.current) return

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 2000  // Increased to reduce frequency and avoid spam
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
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
            const maxDistance = 200 // Increased tolerance to 200m
            const currentTime = Date.now()

            // Protection contre les boucles infinites de reroute
            if (distanceFromRoute > maxDistance && markerPositionRef.current) {
                // Éviter le spam : max 1 reroute par 10 secondes et max 3 reroutes au total
                if (currentTime - lastRerouteTimeRef.current > 10000 && rerouteCountRef.current < 3) {
                    console.warn('Triggering reroute: distance =', Math.round(distanceFromRoute), 'm')
                    lastRerouteTimeRef.current = currentTime
                    rerouteCountRef.current += 1
                    const ev = new CustomEvent('route:off', { detail: { distance: distanceFromRoute, coords: userCoords } })
                    window.dispatchEvent(ev)
                }
                return
            }

            // Set marker to user's ACTUAL GPS position (not projected)
            markerPositionRef.current = userCoords

            // Update progress for gradient (based on projection)
            if (progress >= progressRef.current) {
                progressRef.current = progress
                console.log('Progress updated to:', progress)
            }

            // Create/update marker with user's actual position and correct orientation
            if (!onRouteMarkerRef.current) {
                // Calculer l'angle de direction
                const bearing = calculateBearing(userCoords, routeCoords)

                const el = document.createElement('div')
                // Triangle marker pointing in direction of travel
                el.style.width = '0'
                el.style.height = '0'
                el.style.borderLeft = '12px solid transparent'
                el.style.borderRight = '12px solid transparent'
                el.style.borderBottom = '24px solid #007AFF'
                el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                el.style.transform = `rotate(${bearing}deg)`
                el.style.transformOrigin = 'center bottom'

                onRouteMarkerRef.current = new maplibre.Marker({
                    element: el,
                    anchor: 'bottom'
                })
                    .setLngLat(userCoords)
                    .addTo(map)
            } else {
                // Smoothly move marker to user's position and update orientation
                const bearing = calculateBearing(userCoords, routeCoords)
                const el = onRouteMarkerRef.current.getElement()
                if (el) {
                    el.style.transform = `rotate(${bearing}deg)`
                }
                animateMarkerTo(userCoords)
            }

            // Update route color gradient based on progress
            updateRouteGradient()

            // Center camera on USER's actual position (pas d'animation constante pour éviter les bugs)
            if (!hasCenteredRef.current) {
                try { map.jumpTo({ center: userCoords, zoom: 18 }) } catch { }
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

    const projectOntoRoute = (userCoords: [number, number], routeCoords: [number, number][]): { point: [number, number], progress: number } => {
        if (routeCoords.length < 2) {
            return { point: userCoords, progress: 0 }
        }

        let closestPoint = routeCoords[0]
        let minDistance = Infinity
        let totalDistance = 0
        let reachedDistance = 0

        // Calculate total route distance
        for (let i = 0; i < routeCoords.length - 1; i++) {
            totalDistance += haversineDistance(routeCoords[i], routeCoords[i + 1])
        }

        // Find closest point on route
        let currentDistance = 0
        for (let i = 0; i < routeCoords.length - 1; i++) {
            const segmentStart = routeCoords[i]
            const segmentEnd = routeCoords[i + 1]
            const projected = projectPointOnSegment(userCoords, segmentStart, segmentEnd)
            const distance = haversineDistance(userCoords, projected)

            if (distance < minDistance) {
                minDistance = distance
                closestPoint = projected
                reachedDistance = currentDistance + haversineDistance(segmentStart, projected)
            }

            currentDistance += haversineDistance(segmentStart, segmentEnd)
        }

        const progress = totalDistance > 0 ? Math.min(1, reachedDistance / totalDistance) : 0
        return { point: closestPoint, progress }
    }

    const projectPointOnSegment = (point: [number, number], segStart: [number, number], segEnd: [number, number]): [number, number] => {
        const A = point[0] - segStart[0]
        const B = point[1] - segStart[1]
        const C = segEnd[0] - segStart[0]
        const D = segEnd[1] - segStart[1]

        const dot = A * C + B * D
        const lenSq = C * C + D * D

        if (lenSq === 0) return segStart

        let param = dot / lenSq
        if (param < 0) return segStart
        if (param > 1) return segEnd

        return [
            segStart[0] + param * C,
            segStart[1] + param * D
        ]
    }

    // Calculer l'angle de direction pour orienter le triangle
    const calculateBearing = (userCoords: [number, number], routeCoords: [number, number][]): number => {
        if (routeCoords.length < 2) return 0

        // Trouver la position actuelle sur la route
        const projection = projectOntoRoute(userCoords, routeCoords)
        const currentProgress = projection.progress

        // Calculer la distance totale
        let totalDistance = 0
        for (let i = 0; i < routeCoords.length - 1; i++) {
            totalDistance += haversineDistance(routeCoords[i], routeCoords[i + 1])
        }

        // Trouver le segment actuel et le point suivant
        let targetDistance = currentProgress * totalDistance
        let currentDistance = 0

        for (let i = 0; i < routeCoords.length - 1; i++) {
            const segmentDistance = haversineDistance(routeCoords[i], routeCoords[i + 1])
            if (currentDistance + segmentDistance >= targetDistance) {
                // Utiliser ce segment pour calculer la direction
                const from = routeCoords[i]
                const to = routeCoords[i + 1]

                // Formule correcte pour calculer le bearing géographique
                const lat1 = from[1] * Math.PI / 180
                const lat2 = to[1] * Math.PI / 180
                const deltaLng = (to[0] - from[0]) * Math.PI / 180

                const y = Math.sin(deltaLng) * Math.cos(lat2)
                const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng)

                let bearing = Math.atan2(y, x) * 180 / Math.PI
                // Normaliser l'angle entre 0 et 360
                bearing = (bearing + 360) % 360
                return bearing
            }
            currentDistance += segmentDistance
        }

        // Fallback: utiliser la direction du dernier segment
        if (routeCoords.length >= 2) {
            const from = routeCoords[routeCoords.length - 2]
            const to = routeCoords[routeCoords.length - 1]

            const lat1 = from[1] * Math.PI / 180
            const lat2 = to[1] * Math.PI / 180
            const deltaLng = (to[0] - from[0]) * Math.PI / 180

            const y = Math.sin(deltaLng) * Math.cos(lat2)
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng)

            let bearing = Math.atan2(y, x) * 180 / Math.PI
            bearing = (bearing + 360) % 360
            return bearing
        }

        return 0
    }

    const updateRouteGradient = () => {
        const map = getMap()
        if (!map || !route) return

        try {
            if (map.getLayer && map.getLayer(route.layerId)) {
                // Calculate progress based on user's position on route
                const userCoords = markerPositionRef.current
                if (!userCoords) return

                const routeCoords = routeCoordsRef.current
                const projection = projectOntoRoute(userCoords, routeCoords)
                const actualProgress = Math.max(0, Math.min(0.98, projection.progress))

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

                if (actualProgress < 0.01) {
                    // Start: all blue (not yet started)
                    map.setPaintProperty(route.layerId, 'line-gradient', [
                        'interpolate',
                        ['linear'],
                        ['line-progress'],
                        0, '#007AFF',
                        1, '#007AFF'
                    ])
                } else {
                    // COULEURS CORRIGÉES: gris pour parcouru, bleu pour à venir
                    map.setPaintProperty(route.layerId, 'line-gradient', [
                        'interpolate',
                        ['linear'],
                        ['line-progress'],
                        0, '#9aa0a6',                    // gris depuis le début (parcouru)
                        actualProgress, '#9aa0a6',       // gris jusqu'à la position actuelle
                        actualProgress + 0.01, '#007AFF', // bleu commence juste après
                        1, '#007AFF'                     // bleu jusqu'à la fin (à venir)
                    ])
                }
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

        // Calculate remaining distance based on progress
        const routeCoords = routeCoordsRef.current
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