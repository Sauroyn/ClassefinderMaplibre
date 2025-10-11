import { useEffect, useRef, useState } from 'react'
import type { RouteItem } from './MobileSheets'

export type NavigationState = {
    active: boolean
    route: RouteItem | null
    userPosition: [number, number] | null
    currentStep: number
    floor: string | null
    error?: string
}

export function useNavigationController(route: RouteItem | null, onExit: () => void) {
    const [state, setState] = useState<NavigationState>({
        active: !!route,
        route,
        userPosition: null,
        currentStep: 0,
        floor: null,
    })
    const watchId = useRef<number | null>(null)

    // Start/stop geolocation
    useEffect(() => {
        if (!route) return
        function onPos(pos: GeolocationPosition) {
            setState(s => ({ ...s, userPosition: [pos.coords.longitude, pos.coords.latitude] }))
        }
        function onErr() { }
        if (navigator.geolocation) {
            watchId.current = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 })
        }
        return () => {
            if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
        }
    }, [route])

    // TODO: calcul de l'étape courante, gestion étage, recalc, etc.

    function exit() {
        setState(s => ({ ...s, active: false }))
        onExit()
    }

    return { ...state, exit }
}
