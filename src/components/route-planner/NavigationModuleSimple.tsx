import { useEffect, useState, useRef } from 'react'
import type { RouteStep } from './RouteStepsGenerator'
// overlays are managed via navigation/overlaysManager
import { projectOntoRoute, haversineDistance } from './navigation/geometry'
import { ensureMarkerExists as ensureMarkerEl, updateMarkerOrientation as orientMarker, animateMarkerTo as animateMarker } from './navigation/marker'
import { applyMarkerLevelVisibilityAndAutoSwitch as applyMarkerVisibility } from './navigation/levels'
import { buildFullRouteWithLevels as buildRouteData } from './navigation/routeData'
import { getMapFromRef, setUserLocationDotsVisible } from './navigation/mapUtils'
import { startLocationTracking as startGeo, stopLocationTracking as stopGeo } from './navigation/geolocation'
import { rebuildItineraryOverlays as rebuildOverlaysExt, removeItineraryOverlays as removeOverlaysExt } from './navigation/overlaysManager'
import { updateStepsState } from './navigation/steps'

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
    const [, setCurrentStepIndex] = useState(0)
    const currentStepIndexRef = useRef(0)
    const [, setEtaMinutes] = useState<number | null>(null)
    const [, setRemainingDistance] = useState<number | null>(null)
    const [, setDistanceToNextStep] = useState<number | null>(null)
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

    // Note: previously gated features to mobile; now desktop uses the same flow.

    useEffect(() => {
        if (!isActive || !route) {
            // Cleanup when inactive
            stopGeo({ idRef: watchIdRef as any, isSimulatingRef: isSimulatingClickRef as any })
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }
            try { onRouteMarkerRef.current?.remove?.(); onRouteMarkerRef.current = null } catch { }

            // Restore default user location display
            try { setUserLocationDotsVisible(getMap(), true) } catch { }

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
            if (map) setUserLocationDotsVisible(map, false)
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
                // Ensure marker is created and visible at the start of the itinerary
                const first = (routeCoordsRef.current && routeCoordsRef.current.length) ? routeCoordsRef.current[0] : null
                if (first) {
                    ensureMarkerExists(first)
                    try { onRouteMarkerRef.current?.setLngLat(first) } catch { }
                    markerPositionRef.current = first
                    try { updateMarkerOrientation(first) } catch { }
                    try { applyMarkerLevelVisibilityAndAutoSwitch(first, true) } catch { }
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
                        stopGeo({ idRef: watchIdRef as any, isSimulatingRef: isSimulatingClickRef as any })
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
                            // Apply floor visibility with auto-switch if needed
                            try { applyMarkerLevelVisibilityAndAutoSwitch(projection.point, true) } catch { }
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
                stopGeo({ idRef: watchIdRef as any, isSimulatingRef: isSimulatingClickRef as any })
                    // Mark this update as simulation-allowed
                    ; (pos as any).__allowSimOverride = true
                updateUserLocationOnMap(pos)
                updateCurrentStep()
            } catch { }
        }
        if (simEnabled) {
            window.addEventListener('dev:fake-position', onDevPos as any)
        }

        // Rebuild overlays immediately when the level changes manually (without waiting for location update)
        const onManualLevelChange = () => {
            try {
                const p = progressRef.current
                rebuildItineraryOverlays(Math.max(0, Math.min(1, p)))
                // Update marker visibility for the new level, without forcing auto-switch
                const pos = markerPositionRef.current
                if (pos) applyMarkerLevelVisibilityAndAutoSwitch(pos, false)
            } catch { }
        }
        try { window.addEventListener('level:change', onManualLevelChange as any) } catch { }

        return () => {
            stopGeo({ idRef: watchIdRef as any, isSimulatingRef: isSimulatingClickRef as any })
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }
            // Cleanup itinerary overlays and restore base layers
            try { removeItineraryOverlays(true) } catch { }
            if (simEnabled) {
                try { window.removeEventListener('dev:fake-position', onDevPos as any) } catch { }
            }
            try { window.removeEventListener('level:change', onManualLevelChange as any) } catch { }
            try { mapForRotation?.off?.('rotate', onRotate) } catch { }
            try { mapForRotation?.off?.('move', onRotate) } catch { }
        }
    }, [isActive, route])

    const startLocationTracking = () => {
        if (devOverrideRef.current || isSimulatingClickRef.current) return
        startGeo(
            { idRef: watchIdRef as any, isSimulatingRef: isSimulatingClickRef as any },
            (newPosition) => {
                if (isSimulatingClickRef.current) return
                updateUserLocationOnMap(newPosition)
                updateCurrentStep()
            },
            (error) => { console.warn('Erreur de géolocalisation:', error) }
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
            // Snap to itinerary for display; compute progress from projection
            const projection = projectOntoRoute(userCoords, routeCoords)
            const onRouteCoords = projection.point
            const progress = projection.progress

            // Check if user is too far from route -> suggest reroute but keep marker on path
            const distanceFromRoute = haversineDistance(userCoords, onRouteCoords)
            const maxDistance = 100 // meters
            const currentTime = Date.now()
            if (distanceFromRoute > maxDistance && markerPositionRef.current) {
                if (currentTime - lastRerouteTimeRef.current > 10000 && rerouteCountRef.current < 3) {
                    console.warn('Triggering reroute: distance =', Math.round(distanceFromRoute), 'm')
                    lastRerouteTimeRef.current = currentTime
                    rerouteCountRef.current += 1
                    const ev = new CustomEvent('route:off', { detail: { distance: distanceFromRoute, coords: userCoords } })
                    window.dispatchEvent(ev)
                }
            } else {
                rerouteCountRef.current = 0
            }

            // Always render marker on the itinerary
            const markerCoords = onRouteCoords

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
            try { applyMarkerLevelVisibilityAndAutoSwitch(markerCoords, true) } catch { }
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
        const coords = getRouteCoordinates()
        const built = buildRouteData(map, route ? route.id : null, coords)
        return { coords: built.coords as [number, number][], segMeta: built.segMeta as any }
    }

    // geometry helpers now imported from navigation/geometry

    // (bearing helpers removed; orientation now computed in screen space)

    // Crée le marqueur si besoin
    const ensureMarkerExists = (coords: [number, number]) => {
        const map = getMap()
        if (!map) return
        ensureMarkerEl(map, onRouteMarkerRef as any, coords)
    }

    // Met à jour l'orientation du marqueur selon la direction locale, en espace écran
    const updateMarkerOrientation = (coords: [number, number]) => {
        const map = getMap()
        if (!map) return
        const routeCoords = routeCoordsRef.current
        orientMarker(map, onRouteMarkerRef as any, routeCoords as any, coords as any)
    }

    // getPointAheadOnPolyline / getPointBehindOnPolyline moved to navigation/geometry

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
        animateMarker(onRouteMarkerRef as any, targetCoords as any, animationFrameRef as any, (p) => {
            try { updateMarkerOrientation(p as any) } catch { }
        })
    }

    const updateCurrentStep = () => {
        updateStepsState(
            steps,
            currentStepIndexRef as any,
            markerPositionRef.current as any,
            (routeCoordsRef.current.length ? routeCoordsRef.current : buildFullRouteWithLevels().coords) as any,
            progressRef.current,
            (i) => { setCurrentStepIndex(i); currentStepIndexRef.current = i },
            setDistanceToNextStep,
            setRemainingDistance,
            setEtaMinutes
        )
    }

    const getMap = () => getMapFromRef(mapRef)

    // Floor visibility and auto switching
    const applyMarkerLevelVisibilityAndAutoSwitch = (coords: [number, number], allowAutoSwitch: boolean = true) => {
        const map = getMap()
        if (!map) return
        applyMarkerVisibility(
            map,
            onRouteMarkerRef.current?.getElement?.() || null,
            coords as any,
            routeCoordsRef.current as any,
            segmentMetaRef.current as any,
            allowAutoSwitch
        )
    }

    // chooseActiveLevel + setCurrentLevel moved to navigation/levels

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
        rebuildOverlaysExt(map, route as any, progress, {
            traveledSrcRef: itinTraveledSrcRef as any,
            remainingSrcRef: itinRemainingSrcRef as any,
            traveledLyrRef: itinTraveledLyrRef as any,
            remainingLyrRef: itinRemainingLyrRef as any,
            hiddenBaseRef: hiddenBaseRef as any,
        })
    }

    const removeItineraryOverlays = (restoreBase: boolean) => {
        const map = getMap()
        removeOverlaysExt(map, route as any, {
            traveledSrcRef: itinTraveledSrcRef as any,
            remainingSrcRef: itinRemainingSrcRef as any,
            traveledLyrRef: itinTraveledLyrRef as any,
            remainingLyrRef: itinRemainingLyrRef as any,
            hiddenBaseRef: hiddenBaseRef as any,
        }, restoreBase)
    }

    // getConnectorFeature/getRouteFeatures moved to navigation/routeData

    // (splitLineStringByDistance moved to navigation/overlays)


    return null
}

// Utility functions
// haversineDistance moved to navigation/geometry