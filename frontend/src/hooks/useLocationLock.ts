import { useState, useEffect } from 'react'
import { getCurrentPosition, DEFAULT_GEOLOCATION_OPTS } from '../utils/geolocation'

export type LocationLockConfig = {
    locationLock?: boolean
    perimeterCenter?: [number, number] // [lng, lat]
    perimeterRadius?: number // meters
}

export type LocationLockState = 
    | { status: 'idle' } // No location lock configured
    | { status: 'requesting' } // Requesting permission
    | { status: 'denied' } // Permission denied
    | { status: 'outside'; userPosition: [number, number] } // Outside perimeter
    | { status: 'inside'; userPosition: [number, number] } // Inside perimeter
    | { status: 'error'; error: string } // Error getting position

/**
 * Hook to manage geographic location locking
 * - If userPosition is provided, uses it directly without re-requesting permission
 * - Otherwise, requests user's geolocation when locationLock is enabled
 */
export function useLocationLock(config: LocationLockConfig | null, userPosition?: [number, number] | null): LocationLockState {
    const [state, setState] = useState<LocationLockState>({ status: 'idle' })
    const [permissionDenied, setPermissionDenied] = useState(false)

    useEffect(() => {
        // If no config or locationLock is false, stay idle
        if (!config || !config.locationLock) {
            setState({ status: 'idle' })
            return
        }

        // Validate config
        if (!config.perimeterCenter || !Array.isArray(config.perimeterCenter) || config.perimeterCenter.length !== 2) {
            setState({ status: 'error', error: 'Invalid perimeterCenter configuration' })
            return
        }

        if (typeof config.perimeterRadius !== 'number' || config.perimeterRadius <= 0) {
            setState({ status: 'error', error: 'Invalid perimeterRadius configuration' })
            return
        }

        // If userPosition is provided, use it directly
        if (userPosition && Array.isArray(userPosition) && userPosition.length === 2) {
            const distance = calculateDistance(userPosition, config.perimeterCenter)
            if (distance <= config.perimeterRadius) {
                setState({ status: 'inside', userPosition })
            } else {
                setState({ status: 'outside', userPosition })
            }
            return
        }

        // Otherwise, request position ourselves
        // Check if permission was already denied to avoid re-requesting
        if (permissionDenied) {
            setState({ status: 'denied' })
            return
        }

        // Check if geolocation is available
        if (!navigator.geolocation) {
            setState({ status: 'error', error: 'Geolocation not available' })
            return
        }

        // Request user position
        setState({ status: 'requesting' })

        getCurrentPosition(DEFAULT_GEOLOCATION_OPTS)
            .then(position => {
                const userPos: [number, number] = [position.coords.longitude, position.coords.latitude]
                const distance = calculateDistance(userPos, config.perimeterCenter!)
                console.log('[useLocationLock] Position obtenue:', userPos, 'distance:', distance, 'radius:', config.perimeterRadius)

                if (distance <= config.perimeterRadius!) {
                    console.log('[useLocationLock] ✅ INSIDE zone')
                    setState({ status: 'inside', userPosition: userPos })
                } else {
                    console.log('[useLocationLock] ⚠️ OUTSIDE zone')
                    setState({ status: 'outside', userPosition: userPos })
                }
                
                // 🚀 NOUVEAU : Déclencher immédiatement le bouton de géolocalisation pour afficher le marqueur
                console.log('[useLocationLock] 🎯 Déclenchement du bouton geolocate...')
                setTimeout(() => {
                    try {
                        window.dispatchEvent(new CustomEvent('ui:trigger-geolocate'))
                        console.log('[useLocationLock] ✅ Événement ui:trigger-geolocate envoyé')
                    } catch (e) {
                        console.error('[useLocationLock] Erreur dispatch:', e)
                    }
                }, 200)
            })
            .catch(error => {
                if (error.code === error.PERMISSION_DENIED) {
                    setPermissionDenied(true)
                    setState({ status: 'denied' })
                } else {
                    setState({ status: 'error', error: error.message || 'Failed to get position' })
                }
            })
    }, [config, userPosition, permissionDenied])

    return state
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(point1: [number, number], point2: [number, number]): number {
    const R = 6371000 // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180

    const lat1 = toRad(point1[1])
    const lat2 = toRad(point2[1])
    const dLat = toRad(point2[1] - point1[1])
    const dLng = toRad(point2[0] - point1[0])

    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
}
