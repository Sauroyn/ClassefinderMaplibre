import { useEffect, useState, useRef } from 'react'
import type { RouteStep } from './RouteStepsGenerator'
import { getDirectionIcon } from './RouteStepsGenerator'

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
    onFinishNavigation: () => void
}

type UserPosition = {
    latitude: number
    longitude: number
    accuracy: number
    heading?: number
}

export default function NavigationModule({
    isActive,
    route,
    steps,
    mapRef,
    graph,
    onFinishNavigation
}: Props) {
    const [, setUserPosition] = useState<UserPosition | null>(null)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [distanceToNextStep, setDistanceToNextStep] = useState<number | null>(null)
    const watchIdRef = useRef<number | null>(null)
    const userMarkerRef = useRef<any>(null)
    const hasCenteredRef = useRef<boolean>(false)
    const orientationRef = useRef<number>(0)

    // Détection mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

    useEffect(() => {
        if (!isActive || !route || !isMobile) {
            // Nettoyer le tracking si inactif
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
            return
        }

        // Configuration de la vue 3D
        setupMapFor3D()

        // Démarrer le tracking GPS
        startLocationTracking()

        // Afficher uniquement l'itinéraire sélectionné
        showOnlySelectedRoute()

        // Ecouter l'orientation du device
        const onOrient = (e: DeviceOrientationEvent) => {
            if (e.alpha !== null) {
                orientationRef.current = e.alpha
            }
        }
        try {
            const anyDev = (window as any).DeviceOrientationEvent
            if (anyDev && typeof anyDev.requestPermission === 'function') {
                anyDev.requestPermission().catch(() => { /* ignore */ })
            }
        } catch { }
        try { window.addEventListener('deviceorientation', onOrient as any, true) } catch { }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
            try { window.removeEventListener('deviceorientation', onOrient as any) } catch { }
        }
    }, [isActive, route, isMobile])

    const setupMapFor3D = () => {
        const map = getMap()
        if (!map) return

        try {
            // Basculer en vue 3D avec un angle
            map.easeTo({
                pitch: 45,
                bearing: 0,
                duration: 1000
            })
        } catch (error) {
            console.warn('Erreur lors de la configuration 3D:', error)
        }
    }

    const showOnlySelectedRoute = () => {
        const map = getMap()
        if (!map || !route) return

        try {
            // Masquer tous les autres itinéraires
            const allLayers = map.getStyle()?.layers || []
            allLayers.forEach((layer: any) => {
                if (layer.id.includes('route-planner') && layer.id !== route.layerId) {
                    map.setLayoutProperty(layer.id, 'visibility', 'none')
                }
            })

            // Mettre en évidence l'itinéraire sélectionné
            map.setPaintProperty(route.layerId, 'line-width', 8)
            map.setPaintProperty(route.layerId, 'line-color', '#007AFF')
            map.setPaintProperty(route.layerId, 'line-opacity', 1)
        } catch (error) {
            console.warn('Erreur lors de l\'affichage de l\'itinéraire:', error)
        }
    }

    const startLocationTracking = () => {
        if (!navigator.geolocation) {
            console.warn('Géolocalisation non supportée')
            return
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 1000
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const newPosition: UserPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    heading: position.coords.heading || undefined
                }

                setUserPosition(newPosition)
                updateUserLocationOnMap(newPosition)
                updateCurrentStep(newPosition)
            },
            (error) => {
                console.warn('Erreur de géolocalisation:', error)
            },
            options
        )
    }

    const updateUserLocationOnMap = (position: UserPosition) => {
        const map = getMap()
        if (!map) return

        const coords: [number, number] = [position.longitude, position.latitude]

        try {
            // Projeter la position utilisateur sur l'itinéraire
            const projectedPosition = projectPositionOnRoute(coords)
            const displayPosition = projectedPosition || coords

            // Mettre à jour ou créer le marqueur utilisateur
            if (userMarkerRef.current) {
                userMarkerRef.current.setLngLat(displayPosition)
            } else {
                // Créer un marqueur utilisateur animé
                const el = document.createElement('div')
                el.style.width = '20px'
                el.style.height = '20px'
                el.style.borderRadius = '50%'
                el.style.background = '#007AFF'
                el.style.border = '3px solid white'
                el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)'
                el.style.transition = 'all 0.5s ease'

                if (typeof window !== 'undefined' && (window as any).maplibregl) {
                    userMarkerRef.current = new (window as any).maplibregl.Marker(el)
                        .setLngLat(displayPosition)
                        .addTo(map)
                }
            }

            // Suivre l'utilisateur avec la caméra: recentrer une seule fois au début, ensuite suivre en douceur
            const bearing = (position.heading != null && !Number.isNaN(position.heading)) ? position.heading : (orientationRef.current || 0)
            const camera: any = { bearing, duration: 500 }
            if (!hasCenteredRef.current) {
                try { map.jumpTo({ center: displayPosition, zoom: 18, bearing }) } catch { }
                hasCenteredRef.current = true
            } else {
                map.easeTo(camera)
            }

            // Colorer la progression: partie derrière en gris via line-gradient
            try {
                if (route) {
                    const progress = computeProgressAlongRoute(displayPosition)
                    applyProgressGradient(route.layerId, progress)
                }
            } catch { }

            // Détection hors itinéraire => déclencher un recalcul
            try {
                const distToRoute = distanceToNearestSegment(coords)
                if (distToRoute > 50) {
                    const ev = new CustomEvent('route:off', { detail: { distance: distToRoute } })
                    window.dispatchEvent(ev)
                }
            } catch { }
        } catch (error) {
            console.warn('Erreur lors de la mise à jour de la position:', error)
        }
    }

    const projectPositionOnRoute = (userCoords: [number, number]): [number, number] | null => {
        if (!route || !graph) return null

        try {
            // Récupérer les coordonnées de l'itinéraire
            const routeCoords = getRouteCoordinates()
            if (!routeCoords || routeCoords.length === 0) return null

            // Trouver le point le plus proche sur l'itinéraire
            let closestPoint: [number, number] | null = null
            let minDistance = Infinity
            const maxProjectionDistance = 50 // mètres

            for (let i = 0; i < routeCoords.length - 1; i++) {
                const segmentStart = routeCoords[i]
                const segmentEnd = routeCoords[i + 1]

                const projected = projectPointOnSegment(userCoords, segmentStart, segmentEnd)
                const distance = haversineDistance(userCoords, projected)

                if (distance < minDistance && distance <= maxProjectionDistance) {
                    minDistance = distance
                    closestPoint = projected
                }
            }

            return closestPoint
        } catch (error) {
            console.warn('Erreur lors de la projection:', error)
            return null
        }
    }

    const getRouteCoordinates = (): [number, number][] => {
        if (!route || !graph) return []

        const nodeById = new Map<string, any>()
        for (const n of graph.nodes) {
            nodeById.set(String(n.id), n)
        }

        const coords: [number, number][] = []
        for (const nodeId of route.path) {
            const node = nodeById.get(String(nodeId))
            if (node && node.coord) {
                coords.push([node.coord[0], node.coord[1]])
            }
        }

        return coords
    }

    const computeProgressAlongRoute = (pos: [number, number]) => {
        const coords = getRouteCoordinates()
        if (coords.length < 2) return 0
        // parcourir les segments et trouver la distance cumulée jusqu'au point projeté
        let total = 0
        let reached = 0
        for (let i = 0; i < coords.length - 1; i++) {
            const a = coords[i], b = coords[i + 1]
            const segLen = haversineDistance(a, b)
            total += segLen
            const proj = projectPointOnSegment(pos, a, b)
            const dA = haversineDistance(a, proj)
            const dP = haversineDistance(pos, proj)
            const onSeg = Math.abs(haversineDistance(a, proj) + haversineDistance(proj, b) - segLen) < 1e-2
            if (onSeg && dP < 30) { // si proche du segment
                reached += dA
                break
            } else {
                reached += segLen
            }
        }
        const p = Math.max(0, Math.min(1, reached / Math.max(1, total)))
        return p
    }

    const applyProgressGradient = (layerId: string, progress: number) => {
        const map = getMap()
        if (!map) return
        // line-gradient avec progress: gris jusqu'à progress, bleu après
        try {
            map.setPaintProperty(layerId, 'line-gradient', [
                'interpolate', ['linear'], ['line-progress'],
                0, '#9aa0a6',
                progress, '#9aa0a6',
                progress, '#007AFF',
                1, '#007AFF'
            ])
        } catch { }
    }

    const distanceToNearestSegment = (user: [number, number]) => {
        const coords = getRouteCoordinates()
        let min = Infinity
        for (let i = 0; i < coords.length - 1; i++) {
            const p = projectPointOnSegment(user, coords[i], coords[i + 1])
            const d = haversineDistance(user, p)
            if (d < min) min = d
        }
        return min
    }

    const updateCurrentStep = (position: UserPosition) => {
        if (!steps || steps.length === 0) return

        const userCoords: [number, number] = [position.longitude, position.latitude]

        // Vérifier si l'utilisateur est proche de la prochaine étape
        for (let i = currentStepIndex; i < steps.length; i++) {
            const step = steps[i]
            if (step.coordinates && step.coordinates[0]) {
                const stepCoords = step.coordinates[0] as [number, number]
                const distance = haversineDistance(userCoords, stepCoords)

                if (distance <= 20) { // 20 mètres de tolérance
                    setCurrentStepIndex(i)
                    break
                }
            }
        }

        // Calculer la distance jusqu'à la prochaine étape
        const nextStep = steps[currentStepIndex + 1]
        if (nextStep && nextStep.coordinates && nextStep.coordinates[0]) {
            const nextStepCoords = nextStep.coordinates[0] as [number, number]
            const distance = haversineDistance(userCoords, nextStepCoords)
            setDistanceToNextStep(Math.round(distance))
        } else {
            setDistanceToNextStep(null)
        }
    }

    const getMap = () => {
        return mapRef && mapRef.current && (
            mapRef.current.getMap ? mapRef.current.getMap() :
                (mapRef.current.map ? mapRef.current.map : mapRef.current)
        )
    }

    if (!isActive || !route || !isMobile) return null

    const nextStep = steps[currentStepIndex + 1]

    return (
        <>
            {/* Bandeau de navigation en haut */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                background: 'var(--primary-color, #007AFF)',
                color: 'white',
                padding: '16px 20px',
                zIndex: 100,
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
                {nextStep ? (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>
                                {getDirectionIcon(nextStep.direction)}
                            </span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '16px', fontWeight: 600 }}>
                                    {nextStep.instruction}
                                </div>
                                {distanceToNextStep !== null && (
                                    <div style={{ fontSize: '14px', opacity: 0.9 }}>
                                        dans {distanceToNextStep} m
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 600 }}>
                            🎯 Arrivée proche !
                        </div>
                    </div>
                )}
            </div>

            {/* Bouton terminer en bas */}
            <div style={{
                position: 'fixed',
                bottom: 20,
                left: 20,
                right: 20,
                zIndex: 100
            }}>
                <button
                    onClick={onFinishNavigation}
                    style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '24px',
                        border: 'none',
                        background: '#ff3b30',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                    }}
                >
                    ✋ Terminer le trajet
                </button>
            </div>
        </>
    )
}

// Utilitaires géographiques
function haversineDistance(from: [number, number], to: [number, number]): number {
    const R = 6371000 // rayon de la Terre en mètres
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

function projectPointOnSegment(
    point: [number, number],
    segmentStart: [number, number],
    segmentEnd: [number, number]
): [number, number] {
    const A = point[0] - segmentStart[0]
    const B = point[1] - segmentStart[1]
    const C = segmentEnd[0] - segmentStart[0]
    const D = segmentEnd[1] - segmentStart[1]

    const dot = A * C + B * D
    const lenSq = C * C + D * D

    if (lenSq === 0) return segmentStart

    let param = dot / lenSq

    if (param < 0) return segmentStart
    if (param > 1) return segmentEnd

    return [
        segmentStart[0] + param * C,
        segmentStart[1] + param * D
    ]
}