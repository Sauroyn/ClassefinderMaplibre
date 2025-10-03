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

    // Détection mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

    useEffect(() => {
        if (!isActive || !route || !isMobile) {
            // Cleanup when inactive
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
            try { onRouteMarkerRef.current?.remove?.(); onRouteMarkerRef.current = null } catch { }
            hasCenteredRef.current = false
            return
        }

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
                updateCurrentStep(pos)
            } catch { }
        }
        try { if (import.meta.env && import.meta.env.DEV) window.addEventListener('dev:fake-position', onDevPos as any) } catch { }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
            try { if (import.meta.env && import.meta.env.DEV) window.removeEventListener('dev:fake-position', onDevPos as any) } catch { }
        }
    }, [isActive, route, isMobile])

    const startLocationTracking = () => {
        if (!navigator.geolocation || devOverrideRef.current) return

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 1000
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
                updateCurrentStep(newPosition)
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
            // Project user position onto route line
            const projection = projectOntoRoute(userCoords, routeCoords)
            const onRouteCoords = projection.point
            const progress = projection.progress

            // Check if user is too far from route (> 50m)
            const distanceFromRoute = haversineDistance(userCoords, onRouteCoords)
            if (distanceFromRoute > 50) {
                // Trigger reroute
                const ev = new CustomEvent('route:off', { detail: { distance: distanceFromRoute, coords: userCoords } })
                window.dispatchEvent(ev)
                return
            }

            // Update progress (monotonic - never go backwards)
            progressRef.current = Math.max(progressRef.current, progress)

            // Create/update marker on route line
            if (!onRouteMarkerRef.current) {
                const el = document.createElement('div')
                // Triangle marker pointing in direction of travel
                el.style.width = '0'
                el.style.height = '0'
                el.style.borderLeft = '12px solid transparent'
                el.style.borderRight = '12px solid transparent'
                el.style.borderBottom = '24px solid #007AFF'
                el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'

                onRouteMarkerRef.current = new maplibre.Marker({
                    element: el,
                    anchor: 'bottom'
                })
                    .setLngLat(onRouteCoords)
                    .addTo(map)
            } else {
                onRouteMarkerRef.current.setLngLat(onRouteCoords)
            }

            // Update route color gradient based on progress
            updateRouteGradient(progressRef.current)

            // Center camera once, then follow smoothly
            if (!hasCenteredRef.current) {
                try { map.jumpTo({ center: onRouteCoords, zoom: 18 }) } catch { }
                hasCenteredRef.current = true
            } else {
                map.easeTo({ center: onRouteCoords, duration: 500 })
            }

            // Progress tracking is now handled above
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

    const updateRouteGradient = (progress: number) => {
        const map = getMap()
        if (!map || !route) return

        try {
            if (map.getLayer && map.getLayer(route.layerId)) {
                // Use step function to create sharp color transition
                const threshold = Math.max(0, Math.min(1, progress))
                map.setPaintProperty(route.layerId, 'line-gradient', [
                    'step',
                    ['line-progress'],
                    '#9aa0a6', // gray for completed section
                    threshold,
                    '#007AFF'  // blue for remaining section
                ])
            }
        } catch (e) {
            console.warn('Error updating gradient:', e)
        }
    }

    // Remove unused function

    const updateCurrentStep = (position: any) => {
        if (!steps || steps.length === 0) return

        const userCoords: [number, number] = [position.longitude, position.latitude]

        // Check if user is close to next step
        for (let i = currentStepIndex; i < steps.length; i++) {
            const step = steps[i]
            if (step.coordinates && step.coordinates[0]) {
                const stepCoords = step.coordinates[0] as [number, number]
                const distance = haversineDistance(userCoords, stepCoords)

                if (distance <= 20) { // 20 meters tolerance
                    setCurrentStepIndex(i)
                    break
                }
            }
        }

        // Calculate distance to next step
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