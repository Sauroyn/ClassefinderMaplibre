import maplibre from 'maplibre-gl'
import type React from 'react'
import type { Coord } from './geometry'
import { getPointAheadOnPolyline, getPointBehindOnPolyline, projectOntoRouteDetailed } from './geometry'

export function ensureMarkerExists(map: any, markerRef: React.MutableRefObject<any>, coords: Coord) {
    if (!map) return
    if (!markerRef.current) {
        const el = document.createElement('div')
        el.style.width = '28px'
        el.style.height = '28px'
        el.style.display = 'flex'
        el.style.alignItems = 'center'
        el.style.justifyContent = 'center'
        el.style.pointerEvents = 'none'
        el.style.position = 'relative'
        el.style.zIndex = '1000'

        const rot = document.createElement('div')
        rot.className = 'nav-arrow-rot'
        rot.style.width = '24px'
        rot.style.height = '24px'
        rot.style.display = 'flex'
        rot.style.alignItems = 'center'
        rot.style.justifyContent = 'center'
        rot.style.transformOrigin = '50% 50%'
        rot.style.willChange = 'transform'

        const svgNS = 'http://www.w3.org/2000/svg'
        const svg = document.createElementNS(svgNS, 'svg')
        svg.setAttribute('width', '24')
        svg.setAttribute('height', '24')
        svg.setAttribute('viewBox', '0 0 24 24')
        svg.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'

        const path = document.createElementNS(svgNS, 'path')
        path.setAttribute('d', 'M12 2 L20 18 L12 14 L4 18 Z')
        path.setAttribute('fill', '#007AFF')
        path.setAttribute('stroke', 'white')
        path.setAttribute('stroke-width', '1')
        svg.appendChild(path)
        rot.appendChild(svg)
        el.appendChild(rot)

        markerRef.current = new maplibre.Marker({ element: el, anchor: 'center' })
            .setLngLat(coords)
            .addTo(map)
    }
}

export function updateMarkerOrientation(map: any, markerRef: React.MutableRefObject<any>, routeCoords: Coord[], coords: Coord) {
    if (!markerRef.current || routeCoords.length < 2) return
    if (!map || !map.project) return

    const det = projectOntoRouteDetailed(coords, routeCoords)
    const pBehind = getPointBehindOnPolyline(routeCoords, det.segIndex, det.t, 8) || det.point
    const pAhead = getPointAheadOnPolyline(routeCoords, det.segIndex, det.t, 8) || routeCoords[Math.min(det.segIndex + 1, routeCoords.length - 1)]

    const s0 = map.project({ lng: pBehind[0], lat: pBehind[1] })
    const s1 = map.project({ lng: pAhead[0], lat: pAhead[1] })
    const dx = s1.x - s0.x
    const dy = s1.y - s0.y
    let angleDeg = (Math.atan2(dy, dx) * 180 / Math.PI) + 90
    if (angleDeg < 0) angleDeg += 360
    const rotation = angleDeg % 360
    const el = markerRef.current.getElement()
    const rotEl = el?.querySelector?.('.nav-arrow-rot') as HTMLElement | null
    if (rotEl) rotEl.style.transform = `rotate(${rotation}deg)`
}

export function animateMarkerTo(
    markerRef: React.MutableRefObject<any>,
    targetCoords: Coord,
    animationFrameRef: React.MutableRefObject<number | null>,
    onUpdate?: (coords: Coord) => void
) {
    if (!markerRef.current) return
    const currentLngLat = markerRef.current.getLngLat()
    const currentCoords: Coord = [currentLngLat.lng, currentLngLat.lat]

    const dLng = currentCoords[0] - targetCoords[0]
    const dLat = currentCoords[1] - targetCoords[1]
    // If movement is tiny in degrees, just set the position
    if (Math.abs(dLng) < 1e-7 && Math.abs(dLat) < 1e-7) {
        markerRef.current.setLngLat(targetCoords)
        if (onUpdate) onUpdate(targetCoords)
        return
    }

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    const startTime = Date.now()
    const duration = 300

    const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const currentLng = currentCoords[0] + (targetCoords[0] - currentCoords[0]) * eased
        const currentLat = currentCoords[1] + (targetCoords[1] - currentCoords[1]) * eased
        const p: Coord = [currentLng, currentLat]
        markerRef.current?.setLngLat(p)
        if (onUpdate) onUpdate(p)
        if (progress < 1) animationFrameRef.current = requestAnimationFrame(animate)
        else animationFrameRef.current = null
    }

    animationFrameRef.current = requestAnimationFrame(animate)
}
