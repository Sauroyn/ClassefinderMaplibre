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
    graph
}: Props) {
    const [, setUserPosition] = useState<UserPosition | null>(null)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [, setDistanceToNextStep] = useState<number | null>(null)
    const distNextRef = useRef<number | null>(null)
    const [etaMinutes, setEtaMinutes] = useState<number | null>(null)
    const [remainingDistance, setRemainingDistance] = useState<number | null>(null)
    const watchIdRef = useRef<number | null>(null)
    const userMarkerRef = useRef<any>(null)
    const onRouteMarkerRef = useRef<any>(null)
    const onRouteMarkerElRef = useRef<HTMLDivElement | null>(null)
    const hasCenteredRef = useRef<boolean>(false)
    const orientationRef = useRef<number>(0)
    const devOverrideRef = useRef<boolean>(false)
    const mergedLayerIdRef = useRef<string | null>(null)
    const mergedSourceIdRef = useRef<string | null>(null)
    const mergedCoordsRef = useRef<[number, number][]>([])
    const lastProgressRef = useRef<number>(0)
    const mergedCumRef = useRef<number[]>([])
    const mergedTotalRef = useRef<number>(0)

    // Détection mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

    useEffect(() => {
        // Toggle a body class to hide planner during navigation
        try {
            if (isActive) document.body.classList.add('navigation-active')
            else document.body.classList.remove('navigation-active')
        } catch { }

        if (!isActive || !route || !isMobile) {
            // Nettoyer le tracking si inactif
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
            // nettoyer marqueurs
            try { userMarkerRef.current?.remove?.(); userMarkerRef.current = null } catch { }
            try { onRouteMarkerRef.current?.remove?.(); onRouteMarkerRef.current = null } catch { }
            try { onRouteMarkerElRef.current = null } catch { }
            // Ré-afficher le point de géolocalisation par défaut si caché
            try { toggleDefaultUserDot(true) } catch { }
            // Nettoyer ligne fusionnée
            try { removeMergedSelectedLine() } catch { }
            // Restaurer la couche originale
            try { const map = getMap(); if (map && route?.layerId && map.getLayer(route.layerId)) map.setLayoutProperty(route.layerId, 'visibility', 'visible') } catch { }
            lastProgressRef.current = 0
            mergedCumRef.current = []
            mergedTotalRef.current = 0
            return
        }

        // Configuration de la vue 3D
        setupMapFor3D()

        // Cacher le point de géolocalisation par défaut
        try { toggleDefaultUserDot(false) } catch { }

        // Réinitialiser la progression sur changement d'itinéraire
        lastProgressRef.current = 0
        mergedCumRef.current = []
        mergedTotalRef.current = 0

        // S'assurer qu'une couche fusionnée existe pour le gradient
        ensureMergedSelectedLine()

        // Démarrer le tracking GPS (sauf en mode dev override)
        startLocationTracking()

        // Dev-only: écouter positions simulées
        const onDevPos = (e: any) => {
            try {
                const d = e.detail as [number, number]
                const pos: UserPosition = { longitude: d[0], latitude: d[1], accuracy: 5 }
                // Dès le premier clic dev, on coupe la vraie géolocalisation jusqu'au reload
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
                    try { if (map.getLayer && map.getLayer(layer.id)) map.setLayoutProperty(layer.id, 'visibility', 'none') } catch { }
                }
            })

            // Mettre en évidence l'itinéraire sélectionné
            if (map.getLayer && map.getLayer(route.layerId)) {
                try { map.setPaintProperty(route.layerId, 'line-width', 8) } catch { }
                try { map.setPaintProperty(route.layerId, 'line-color', '#007AFF') } catch { }
                try { map.setPaintProperty(route.layerId, 'line-opacity', 1) } catch { }
                // Cacher la couche originale pendant la navigation pour ne garder que la couche fusionnée
                try { map.setLayoutProperty(route.layerId, 'visibility', 'none') } catch { }
            }
            // Créer/mettre à jour la ligne fusionnée utilisée pour le gradient
            ensureMergedSelectedLine()
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

        // Si dev override actif ou position fake déjà définie, ne pas démarrer de watch
        if ((import.meta.env && import.meta.env.DEV && (window as any).__DEV_FAKE_POS__) || devOverrideRef.current) {
            const d = (window as any).__DEV_FAKE_POS__ as [number, number]
            const pos: UserPosition = { longitude: d[0], latitude: d[1], accuracy: 5 }
            updateUserLocationOnMap(pos)
            updateCurrentStep(pos)
            return
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
            const proj = projectPositionOnRoute(coords)
            const displayPosition = (proj && proj.point) || coords
            const segBearing = proj ? proj.bearing : (position.heading != null ? position.heading : (orientationRef.current || 0))

            // Remplacer l'indicateur user par un marqueur projeté sur la route
            const projected = proj
            const onRoutePos = (projected && projected.point) || displayPosition
            // Déterminer la cible le long de la ligne par le progress (monotone)
            const coordsMerged = getMergedRouteCoords()
            const computedProgress = proj && typeof proj.progress === 'number' ? proj.progress : computeProgressAlongRoute(displayPosition)
            const monotoneProgress = Math.max(lastProgressRef.current, computedProgress)
            lastProgressRef.current = Math.min(1, monotoneProgress)
            const targetCreate = getCoordAtProgress(lastProgressRef.current) || displayPosition

            if (!onRouteMarkerRef.current) {
                const el2 = document.createElement('div')
                // Triangle orientable (pointe vers le cap)
                el2.style.width = '0'
                el2.style.height = '0'
                el2.style.borderLeft = '12px solid transparent'
                el2.style.borderRight = '12px solid transparent'
                el2.style.borderBottom = '24px solid #007AFF'
                // halo/blanc
                el2.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))'
                el2.style.transition = 'transform 0.25s ease, left 0.25s ease, top 0.25s ease'
                el2.style.transformOrigin = '50% 100%'
                onRouteMarkerElRef.current = el2
                onRouteMarkerRef.current = new maplibre.Marker({ element: el2, anchor: 'bottom' })
                    .setLngLat(targetCreate)
                    .addTo(map)
            } else {
                const target = getCoordAtProgress(lastProgressRef.current)
                if (target) onRouteMarkerRef.current.setLngLat(target)
            }

            // Orienter le marqueur dans le sens de la ligne
            try {
                if (onRouteMarkerElRef.current) {
                    onRouteMarkerElRef.current.style.transform = `rotate(${segBearing}deg)`
                }
            } catch { }

            // Suivre l'utilisateur avec la caméra: recentrer une seule fois au début, ensuite suivre en douceur
            const bearing = (position.heading != null && !Number.isNaN(position.heading)) ? position.heading : segBearing
            const camera: any = { bearing, duration: 500 }
            if (!hasCenteredRef.current) {
                // Centrer sur la cible le long de la ligne (pas la projection brute)
                const target = getCoordAtProgress(lastProgressRef.current) || displayPosition
                try { map.jumpTo({ center: target, zoom: 18, bearing }) } catch { }
                hasCenteredRef.current = true
            } else {
                const target = getCoordAtProgress(lastProgressRef.current) || displayPosition
                map.easeTo({ ...camera, center: target })
            }

            // Colorer la progression: partie derrière en gris via line-gradient
            try {
                if (route) {
                    const progress = lastProgressRef.current
                    applyProgressGradient(progress)
                    // Distances et ETA approximative
                    let total = 0
                    if (mergedTotalRef.current > 0) total = mergedTotalRef.current
                    else { for (let i = 0; i < coordsMerged.length - 1; i++) total += haversineDistance(coordsMerged[i], coordsMerged[i + 1]); mergedTotalRef.current = total }
                    const remain = Math.max(0, (1 - progress) * total)
                    setRemainingDistance(remain)
                    // vitesse 1.2 m/s par défaut ~ piéton (ajuster si besoin)
                    const speed = 1.2
                    setEtaMinutes(Math.round(remain / speed / 60))
                }
            } catch { }

            // Détection hors itinéraire => déclencher un recalcul
            try {
                const distToRoute = distanceToNearestSegment(coords)
                if (distToRoute > 50) {
                    const ev = new CustomEvent('route:off', { detail: { distance: distToRoute, coords, projected: onRoutePos } })
                    window.dispatchEvent(ev)
                }
            } catch { }
        } catch (error) {
            console.warn('Erreur lors de la mise à jour de la position:', error)
        }
    }

    const projectPositionOnRoute = (userCoords: [number, number]): { point: [number, number], bearing: number, progress: number } | null => {
        if (!route || !graph) return null

        try {
            // Récupérer les coordonnées de l'itinéraire
            const routeCoords = getMergedRouteCoords()
            if (!routeCoords || routeCoords.length === 0) return null

            // Préparer cumul et total
            ensureCumulative()

            // Trouver le point le plus proche sur l'itinéraire
            let closestPoint: [number, number] | null = null
            let minDistance = Infinity
            let bestBearing = 0
            let reachedDist = 0

            for (let i = 0; i < routeCoords.length - 1; i++) {
                const segmentStart = routeCoords[i]
                const segmentEnd = routeCoords[i + 1]

                const projected = projectPointOnSegment(userCoords, segmentStart, segmentEnd)
                const distance = haversineDistance(userCoords, projected)

                if (distance < minDistance) {
                    minDistance = distance
                    closestPoint = projected
                    bestBearing = bearingBetweenPoints(segmentStart, segmentEnd)
                    // distance atteinte jusqu'au point projeté
                    const cum = mergedCumRef.current
                    const segLen = haversineDistance(segmentStart, segmentEnd)
                    const dA = haversineDistance(segmentStart, projected)
                    reachedDist = (cum[i] || 0) + Math.min(segLen, dA)
                }
            }

            const progress = mergedTotalRef.current > 0 ? Math.max(0, Math.min(1, reachedDist / mergedTotalRef.current)) : 0
            return closestPoint ? { point: closestPoint, bearing: bestBearing, progress } : null
        } catch (error) {
            console.warn('Erreur lors de la projection:', error)
            return null
        }
    }

    // getRouteCoordinates remplacé par getMergedRouteCoords pour un line-progress fidèle

    // Coordonnées fusionnées suivant les géométries d'arêtes (pour un line-progress fiable)
    const getMergedRouteCoords = (): [number, number][] => {
        if (!route || !graph) return []
        if (mergedCoordsRef.current && mergedCoordsRef.current.length) return mergedCoordsRef.current
        const nodeById = new Map<string, any>(graph.nodes.map((n: any) => [String(n.id), n]))
        const merged: [number, number][][] = []
        for (let i = 1; i < route.path.length; i++) {
            const aId = String(route.path[i - 1])
            const bId = String(route.path[i])
            const aNode = nodeById.get(aId)
            const bNode = nodeById.get(bId)
            if (!aNode || !bNode) continue
            const edge = graph.edges.find((e: any) => (String(e.from) === aId && String(e.to) === bId) || (String(e.from) === bId && String(e.to) === aId))
            let seg: [number, number][] = []
            if (edge && edge.raw && edge.raw.geometry && edge.raw.geometry.type === 'LineString') {
                seg = edge.raw.geometry.coordinates.slice()
                // orienter du a -> b via heuristique de somme des distances
                const sum1 = haversineDistance(seg[0] as any, aNode.coord as any) + haversineDistance(seg[seg.length - 1] as any, bNode.coord as any)
                const sum2 = haversineDistance(seg[0] as any, bNode.coord as any) + haversineDistance(seg[seg.length - 1] as any, aNode.coord as any)
                if (sum2 < sum1) seg = seg.slice().reverse() as any
            } else {
                seg = [aNode.coord, bNode.coord]
            }
            merged.push(seg)
        }
        // concat en évitant les doublons aux joints
        const out: [number, number][] = []
        for (let i = 0; i < merged.length; i++) {
            const seg = merged[i]
            if (i === 0) out.push(...seg)
            else out.push(...seg.slice(1))
        }
        mergedCoordsRef.current = out
        // préparer cumul et total
        computeCumulative(out)
        return out
    }

    const computeProgressAlongRoute = (pos: [number, number]) => {
        const coords = getMergedRouteCoords()
        if (coords.length < 2) return 0
        ensureCumulative()
        let minD = Infinity
        let progress = 0
        for (let i = 0; i < coords.length - 1; i++) {
            const a = coords[i], b = coords[i + 1]
            const proj = projectPointOnSegment(pos, a, b)
            const d = haversineDistance(pos, proj)
            if (d < minD) {
                minD = d
                const segLen = haversineDistance(a, b)
                const dA = haversineDistance(a, proj)
                const reached = (mergedCumRef.current[i] || 0) + Math.min(segLen, dA)
                progress = mergedTotalRef.current > 0 ? reached / mergedTotalRef.current : 0
            }
        }
        return Math.max(0, Math.min(1, progress))
    }

    const computeCumulative = (coords: [number, number][]) => {
        const cum: number[] = new Array(Math.max(1, coords.length)).fill(0)
        let total = 0
        for (let i = 0; i < coords.length - 1; i++) {
            const len = haversineDistance(coords[i], coords[i + 1])
            cum[i] = total
            total += len
        }
        cum[coords.length - 1] = total
        mergedCumRef.current = cum
        mergedTotalRef.current = total
    }

    const ensureCumulative = () => {
        if (!mergedCoordsRef.current.length) return
        if (!mergedCumRef.current.length || mergedTotalRef.current <= 0) computeCumulative(mergedCoordsRef.current)
    }

    const getCoordAtProgress = (p: number): [number, number] | null => {
        const coords = getMergedRouteCoords()
        if (coords.length < 2) return coords[0] || null
        ensureCumulative()
        const total = mergedTotalRef.current
        if (total <= 0) return coords[0]
        const targetDist = Math.max(0, Math.min(1, p)) * total
        const cum = mergedCumRef.current
        // find segment
        let i = 0
        while (i < coords.length - 1 && !(cum[i] <= targetDist && targetDist <= cum[i + 1])) i++
        const a = coords[i], b = coords[i + 1]
        const segLen = haversineDistance(a, b)
        const remainingOnSeg = Math.max(0, Math.min(segLen, targetDist - cum[i]))
        const t = segLen > 0 ? remainingOnSeg / segLen : 0
        // linear interpolate in lon/lat
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    }

    const applyProgressGradient = (progress: number) => {
        const map = getMap()
        if (!map) return
        // Utiliser une expression 'step' pour un gradient stable (0 -> gris, progress -> bleu)
        try {
            const layerId = mergedLayerIdRef.current
            if (layerId && map.getLayer && map.getLayer(layerId)) {
                const threshold = Math.max(0, Math.min(1, progress))
                map.setPaintProperty(layerId, 'line-gradient', [
                    'step', ['line-progress'], '#9aa0a6',
                    threshold, '#007AFF'
                ])
            }
        } catch { }
    }

    const distanceToNearestSegment = (user: [number, number]) => {
        const coords = getMergedRouteCoords()
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
            const v = Math.round(distance)
            setDistanceToNextStep(v)
            distNextRef.current = v
        } else {
            setDistanceToNextStep(null)
            distNextRef.current = null
        }

        try { window.dispatchEvent(new CustomEvent('nav:state', { detail: { currentStepIndex, etaMinutes, remainingDistance, distanceToNextStep: distNextRef.current } })) } catch { }
    }

    const getMap = () => {
        return mapRef && mapRef.current && (
            mapRef.current.getMap ? mapRef.current.getMap() :
                (mapRef.current.map ? mapRef.current.map : mapRef.current)
        )
    }

    // Créer/mettre à jour une ligne fusionnée pour l'itinéraire sélectionné (utilisée pour line-progress)
    const ensureMergedSelectedLine = () => {
        const map = getMap()
        if (!map || !route) return
        try {
            const coords = getMergedRouteCoords()
            if (!coords || coords.length < 2) return
            const srcId = mergedSourceIdRef.current || 'route-planner-selected-merged'
            const lyrId = mergedLayerIdRef.current || 'route-planner-selected-merged-line'
            mergedSourceIdRef.current = srcId
            mergedLayerIdRef.current = lyrId
            const fc = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }] }
            if (map.getSource(srcId)) (map.getSource(srcId) as any).setData(fc)
            else map.addSource(srcId, { type: 'geojson', data: fc, lineMetrics: true as any })
            if (!map.getLayer(lyrId)) {
                map.addLayer({ id: lyrId, type: 'line', source: srcId, paint: { 'line-color': '#007AFF', 'line-width': 8, 'line-opacity': 1 }, layout: { 'line-cap': 'round', 'line-join': 'round' } })
            }
            // placer au-dessus de la couche originale si possible
            try { if (map.moveLayer && map.getLayer(route.layerId)) map.moveLayer(lyrId, route.layerId) } catch { }
        } catch { }
    }

    const removeMergedSelectedLine = () => {
        const map = getMap()
        if (!map) return
        try {
            const lyrId = mergedLayerIdRef.current
            const srcId = mergedSourceIdRef.current
            if (lyrId && map.getLayer(lyrId)) map.removeLayer(lyrId)
            if (srcId && map.getSource(srcId)) map.removeSource(srcId)
        } catch { }
        mergedLayerIdRef.current = null
        mergedSourceIdRef.current = null
        mergedCoordsRef.current = []
    }

    return null
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

// Calcul d'un cap (bearing) en degrés entre deux points (lon/lat)
function bearingBetweenPoints(a: [number, number], b: [number, number]): number {
    const [lon1, lat1] = a.map(v => v * Math.PI / 180) as [number, number]
    const [lon2, lat2] = b.map(v => v * Math.PI / 180) as [number, number]
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
    const brng = Math.atan2(y, x) * 180 / Math.PI
    return (brng + 360) % 360
}

// Masquer/afficher les couches de géolocalisation par défaut du contrôle
function toggleDefaultUserDot(show: boolean) {
    try {
        const mapRefAny = (window as any).mapRef
        const map = mapRefAny?.current?.getMap?.() || mapRefAny?.current || null
        if (!map) return
        // Cacher/afficher éventuelles couches
        const layers = map.getStyle()?.layers || []
        for (const l of layers) {
            if (!l || typeof l.id !== 'string') continue
            if (l.id.includes('user-location')) {
                try { map.setLayoutProperty(l.id, 'visibility', show ? 'visible' : 'none') } catch { }
            }
        }
        // Cacher/afficher marqueur DOM de la geolocate control
        try {
            const container = map.getContainer?.()
            if (container) {
                const candidates = container.querySelectorAll(
                    '.maplibregl-user-location, .mapboxgl-user-location, .maplibregl-user-location-dot, .mapboxgl-user-location-dot'
                ) as any
                candidates?.forEach?.((el: HTMLElement) => { el.style.display = show ? 'block' : 'none' })
            }
        } catch { }
    } catch { }
}