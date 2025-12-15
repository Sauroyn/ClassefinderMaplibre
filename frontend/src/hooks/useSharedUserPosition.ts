import { useEffect, useState } from 'react'
import maplibre from 'maplibre-gl'

/**
 * Hook to track user position from Maplibre's GeolocateControl
 * This position is shared with location lock to avoid requesting permission twice
 */
export function useSharedUserPosition(geolocateControl: maplibre.GeolocateControl | null): [number, number] | null {
    const [position, setPosition] = useState<[number, number] | null>(null)

    useEffect(() => {
        if (!geolocateControl) return

        // Listen for geolocate events from the control
        const onGeolocate = (e: any) => {
            try {
                const coords = e?.coords
                if (coords && typeof coords.longitude === 'number' && typeof coords.latitude === 'number') {
                    console.log('[useSharedUserPosition] 📍 Position reçue du GeolocateControl:', [coords.longitude, coords.latitude])
                    setPosition([coords.longitude, coords.latitude])
                }
            } catch { }
        }

        const onGeolocateError = () => {
            // Clear position on error
            setPosition(null)
        }

        try {
            geolocateControl.on('geolocate', onGeolocate)
            geolocateControl.on('error', onGeolocateError)

            return () => {
                try {
                    geolocateControl.off('geolocate', onGeolocate)
                    geolocateControl.off('error', onGeolocateError)
                } catch { }
            }
        } catch { }
    }, [geolocateControl])

    return position
}
