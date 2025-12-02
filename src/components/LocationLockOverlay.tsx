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
const USER_MARKER_SOURCE_ID = 'location-lock-user-marker'
const USER_MARKER_LAYER_ID = 'location-lock-user-marker-layer'

/**
 * Component to display location lock perimeter and user position on the map
 */
export default function LocationLockOverlay({ map, lockState, perimeterCenter, perimeterRadius }: Props) {
    
    // Draw perimeter circle
    useEffect(() => {
        if (!map || !perimeterCenter || !perimeterRadius) return

        const shouldShowPerimeter = lockState.status === 'denied' || lockState.status === 'outside'
        
        if (!shouldShowPerimeter) {
            // Remove perimeter if not needed
            if (map.getLayer(PERIMETER_BORDER_LAYER_ID)) map.removeLayer(PERIMETER_BORDER_LAYER_ID)
            if (map.getLayer(PERIMETER_LAYER_ID)) map.removeLayer(PERIMETER_LAYER_ID)
            if (map.getSource(PERIMETER_SOURCE_ID)) map.removeSource(PERIMETER_SOURCE_ID)
            return
        }

        // Create circle GeoJSON
        const circle = createCircle(perimeterCenter, perimeterRadius, 64)

        // Add or update source
        const source = map.getSource(PERIMETER_SOURCE_ID) as maplibre.GeoJSONSource
        if (source) {
            source.setData(circle)
        } else {
            map.addSource(PERIMETER_SOURCE_ID, {
                type: 'geojson',
                data: circle
            })
        }

        // Add fill layer
        if (!map.getLayer(PERIMETER_LAYER_ID)) {
            map.addLayer({
                id: PERIMETER_LAYER_ID,
                type: 'fill',
                source: PERIMETER_SOURCE_ID,
                paint: {
                    'fill-color': '#3b82f6',
                    'fill-opacity': 0.1
                }
            })
        }

        // Add border layer
        if (!map.getLayer(PERIMETER_BORDER_LAYER_ID)) {
            map.addLayer({
                id: PERIMETER_BORDER_LAYER_ID,
                type: 'line',
                source: PERIMETER_SOURCE_ID,
                paint: {
                    'line-color': '#3b82f6',
                    'line-width': 2,
                    'line-dasharray': [2, 2]
                }
            })
        }

        return () => {
            if (map.getLayer(PERIMETER_BORDER_LAYER_ID)) map.removeLayer(PERIMETER_BORDER_LAYER_ID)
            if (map.getLayer(PERIMETER_LAYER_ID)) map.removeLayer(PERIMETER_LAYER_ID)
            if (map.getSource(PERIMETER_SOURCE_ID)) map.removeSource(PERIMETER_SOURCE_ID)
        }
    }, [map, lockState, perimeterCenter, perimeterRadius])

    // Draw user marker
    useEffect(() => {
        if (!map) return

        const userPosition = lockState.status === 'outside' || lockState.status === 'inside' 
            ? lockState.userPosition 
            : null

        if (!userPosition) {
            // Remove user marker
            if (map.getLayer(USER_MARKER_LAYER_ID)) map.removeLayer(USER_MARKER_LAYER_ID)
            if (map.getSource(USER_MARKER_SOURCE_ID)) map.removeSource(USER_MARKER_SOURCE_ID)
            return
        }

        // Create point GeoJSON
        const point: GeoJSON.Feature = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: userPosition
            },
            properties: {}
        }

        // Add or update source
        const source = map.getSource(USER_MARKER_SOURCE_ID) as maplibre.GeoJSONSource
        if (source) {
            source.setData(point)
        } else {
            map.addSource(USER_MARKER_SOURCE_ID, {
                type: 'geojson',
                data: point
            })
        }

        // Add marker layer (only show when outside perimeter)
        const showMarker = lockState.status === 'outside'
        
        if (!map.getLayer(USER_MARKER_LAYER_ID)) {
            map.addLayer({
                id: USER_MARKER_LAYER_ID,
                type: 'circle',
                source: USER_MARKER_SOURCE_ID,
                paint: {
                    'circle-radius': 10,
                    'circle-color': '#ef4444',
                    'circle-stroke-width': 3,
                    'circle-stroke-color': '#ffffff',
                    'circle-opacity': showMarker ? 1 : 0
                }
            })
        } else {
            map.setPaintProperty(USER_MARKER_LAYER_ID, 'circle-opacity', showMarker ? 1 : 0)
        }

        return () => {
            if (map.getLayer(USER_MARKER_LAYER_ID)) map.removeLayer(USER_MARKER_LAYER_ID)
            if (map.getSource(USER_MARKER_SOURCE_ID)) map.removeSource(USER_MARKER_SOURCE_ID)
        }
    }, [map, lockState])

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
