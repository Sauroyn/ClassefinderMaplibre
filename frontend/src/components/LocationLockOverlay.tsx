import { useEffect } from 'react'
import maplibre from 'maplibre-gl'
import type { LocationLockState } from '../hooks/useLocationLock'

type Props = {
    map: maplibre.Map | null
    lockState: LocationLockState
    perimeterCenter?: [number, number]
    perimeterRadius?: number
}

const PERIMETER_SOURCE_ID = 'location-lock-perimeter'
const PERIMETER_LAYER_ID = 'location-lock-perimeter-layer'
const PERIMETER_BORDER_LAYER_ID = 'location-lock-perimeter-border'
// We rely on Maplibre's built-in GeolocateControl marker; no custom marker.

/**
 * Component to display location lock perimeter and user position on the map
 */
export default function LocationLockOverlay({ map, lockState, perimeterCenter, perimeterRadius }: Props) {
    
    // Draw perimeter circle
    useEffect(() => {
        if (!map || !perimeterCenter || !perimeterRadius) return

        const drawPerimeter = () => {
            const shouldShowPerimeter = lockState.status === 'denied' || lockState.status === 'outside'
            if (!shouldShowPerimeter) {
                if (map.getLayer(PERIMETER_BORDER_LAYER_ID)) map.removeLayer(PERIMETER_BORDER_LAYER_ID)
                if (map.getLayer(PERIMETER_LAYER_ID)) map.removeLayer(PERIMETER_LAYER_ID)
                if (map.getSource(PERIMETER_SOURCE_ID)) map.removeSource(PERIMETER_SOURCE_ID)
                return
            }

            const circle = createCircle(perimeterCenter, perimeterRadius, 64)
            try {
                const source = map.getSource(PERIMETER_SOURCE_ID) as maplibre.GeoJSONSource
                if (source) {
                    source.setData(circle)
                } else {
                    map.addSource(PERIMETER_SOURCE_ID, { type: 'geojson', data: circle })
                }
                if (!map.getLayer(PERIMETER_LAYER_ID)) {
                    map.addLayer({ id: PERIMETER_LAYER_ID, type: 'fill', source: PERIMETER_SOURCE_ID, paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.1 } })
                }
                if (!map.getLayer(PERIMETER_BORDER_LAYER_ID)) {
                    map.addLayer({ id: PERIMETER_BORDER_LAYER_ID, type: 'line', source: PERIMETER_SOURCE_ID, paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [2, 2] } })
                }
            } catch (err) {
                console.warn('[LocationLockOverlay] Error adding perimeter:', err)
            }
        }

        // If style not yet loaded, draw once on map load
        if (!map.isStyleLoaded?.()) {
            const onLoad = () => { try { drawPerimeter() } catch {} }
            map.once('load', onLoad)
            return () => { try { map.off('load', onLoad) } catch {} }
        }

        drawPerimeter()

        return () => {
            if (map.getLayer(PERIMETER_BORDER_LAYER_ID)) map.removeLayer(PERIMETER_BORDER_LAYER_ID)
            if (map.getLayer(PERIMETER_LAYER_ID)) map.removeLayer(PERIMETER_LAYER_ID)
            if (map.getSource(PERIMETER_SOURCE_ID)) map.removeSource(PERIMETER_SOURCE_ID)
        }
    }, [map, lockState, perimeterCenter, perimeterRadius])

    // No custom user marker: the GeolocateControl renders its own dot and accuracy circle.
    // This overlay only manages the perimeter visualization.

    return null
}

/**
 * Create a circle polygon GeoJSON feature
 */
function createCircle(center: [number, number], radiusInMeters: number, points: number = 64): GeoJSON.Feature {
    const coords: number[][] = []
    const distanceX = radiusInMeters / (111320 * Math.cos(center[1] * Math.PI / 180))
    const distanceY = radiusInMeters / 110540

    for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI)
        const x = distanceX * Math.cos(theta)
        const y = distanceY * Math.sin(theta)
        coords.push([center[0] + x, center[1] + y])
    }
    coords.push(coords[0]) // Close the polygon

    return {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [coords]
        },
        properties: {}
    }
}
