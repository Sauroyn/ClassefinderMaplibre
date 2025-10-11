export type GeoWatch = {
    idRef: React.MutableRefObject<number | null>,
    isSimulatingRef: React.MutableRefObject<boolean>,
}

export function startLocationTracking(
    watch: GeoWatch,
    onUpdate: (position: { latitude: number; longitude: number; accuracy: number; heading?: number } & { __allowSimOverride?: boolean }) => void,
    onError?: (error: GeolocationPositionError | any) => void
) {
    if (!navigator.geolocation || watch.isSimulatingRef.current) return

    const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }

    watch.idRef.current = navigator.geolocation.watchPosition(
        (position) => {
            if (watch.isSimulatingRef.current) return
            const newPosition = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading || undefined
            }
            onUpdate(newPosition)
        },
        (error) => { if (onError) onError(error) },
        options
    )
}

export function stopLocationTracking(watch: GeoWatch) {
    if (watch.idRef.current !== null) {
        try { navigator.geolocation.clearWatch(watch.idRef.current) } catch { }
        watch.idRef.current = null
    }
}
