export function getMapFromRef(mapRef: any): any {
    return mapRef && mapRef.current && (
        mapRef.current.getMap ? mapRef.current.getMap() :
            (mapRef.current.map ? mapRef.current.map : mapRef.current)
    )
}

export function setUserLocationDotsVisible(map: any, visible: boolean) {
    try {
        if (!map || !map.getContainer) return
        const container = map.getContainer()
        if (!container) return
        const dots = container.querySelectorAll('.maplibregl-user-location-dot, .mapboxgl-user-location-dot')
        dots.forEach((dot: any) => { dot.style.display = visible ? 'block' : 'none' })
    } catch { /* noop */ }
}
