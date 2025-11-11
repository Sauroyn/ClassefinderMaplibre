/**
 * Helper utilities for working with MapLibre map instances
 * Reduces repetitive patterns and null checks
 */

import type maplibre from 'maplibre-gl'

/**
 * Safely extract the actual MapLibre Map instance from various ref structures
 * Handles different ref patterns used throughout the codebase
 */
export function getMapInstance(mapRef: any): maplibre.Map | null {
    if (!mapRef) return null

    // Direct ref.current
    const ref = mapRef.current
    if (!ref) return null

    // Check if it's already a Map instance (has getSource method)
    if (ref.getSource) return ref

    // Check for getMap() method
    if (typeof ref.getMap === 'function') {
        return ref.getMap()
    }

    // Check for .map property
    if (ref.map && ref.map.getSource) {
        return ref.map
    }

    return null
}

/**
 * Safely check if a layer exists on the map
 */
export function hasLayer(map: maplibre.Map | null, layerId: string): boolean {
    if (!map) return false
    try {
        return !!(map.getLayer && map.getLayer(layerId))
    } catch {
        return false
    }
}

/**
 * Safely check if a source exists on the map
 */
export function hasSource(map: maplibre.Map | null, sourceId: string): boolean {
    if (!map) return false
    try {
        return !!(map.getSource && map.getSource(sourceId))
    } catch {
        return false
    }
}

/**
 * Safely remove a layer from the map
 */
export function removeLayer(map: maplibre.Map | null, layerId: string): void {
    if (!map) return
    try {
        if (hasLayer(map, layerId)) {
            map.removeLayer(layerId)
        }
    } catch {
        // Ignore errors
    }
}

/**
 * Safely remove a source from the map
 */
export function removeSource(map: maplibre.Map | null, sourceId: string): void {
    if (!map) return
    try {
        if (hasSource(map, sourceId)) {
            map.removeSource(sourceId)
        }
    } catch {
        // Ignore errors
    }
}

/**
 * Safely set a paint property on a layer
 */
export function setPaintProperty(
    map: maplibre.Map | null,
    layerId: string,
    property: string,
    value: any
): void {
    if (!map) return
    try {
        if (hasLayer(map, layerId) && map.setPaintProperty) {
            map.setPaintProperty(layerId, property, value)
        }
    } catch {
        // Ignore errors
    }
}

/**
 * Safely set a layout property on a layer
 */
export function setLayoutProperty(
    map: maplibre.Map | null,
    layerId: string,
    property: string,
    value: any
): void {
    if (!map) return
    try {
        if (hasLayer(map, layerId) && map.setLayoutProperty) {
            map.setLayoutProperty(layerId, property, value)
        }
    } catch {
        // Ignore errors
    }
}

/**
 * Safely set a filter on a layer
 */
export function setFilter(
    map: maplibre.Map | null,
    layerId: string,
    filter: any
): void {
    if (!map) return
    try {
        if (hasLayer(map, layerId) && map.setFilter) {
            map.setFilter(layerId, filter)
        }
    } catch {
        // Ignore errors
    }
}

/**
 * Get all layer IDs matching a prefix
 */
export function getLayersWithPrefix(map: maplibre.Map | null, prefix: string): string[] {
    if (!map) return []
    try {
        const style = map.getStyle?.()
        const layers = (style && style.layers) || []
        return layers
            .map((l: any) => l.id)
            .filter((id: string) => typeof id === 'string' && id.startsWith(prefix))
    } catch {
        return []
    }
}

/**
 * Get all source IDs matching a prefix
 */
export function getSourcesWithPrefix(map: maplibre.Map | null, prefix: string): string[] {
    if (!map) return []
    try {
        const style = map.getStyle?.()
        const sources = (style && style.sources) || {}
        return Object.keys(sources).filter(id => id.startsWith(prefix))
    } catch {
        return []
    }
}

/**
 * Safely set feature state
 * @param map - MapLibre map instance
 * @param source - Source ID
 * @param id - Feature ID
 * @param state - State object to set
 */
export function setFeatureState(
    map: maplibre.Map | null,
    source: string,
    id: number | string,
    state: Record<string, any>
): void {
    if (!map) return
    try {
        if (map.setFeatureState) {
            map.setFeatureState({ source, id }, state)
        }
    } catch {
        // Ignore errors
    }
}
