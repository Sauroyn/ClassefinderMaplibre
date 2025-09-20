import React, { useEffect, useRef } from 'react'
import maplibre from 'maplibre-gl'

type Props = { map?: maplibre.Map | null }

const UserGeolocate: React.FC<Props> = ({ map }) => {
    const controlRef = useRef<maplibre.GeolocateControl | null>(null)

    useEffect(() => {
        if (!map) return
        if (!controlRef.current) {
            controlRef.current = new maplibre.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true })
            try { map.addControl(controlRef.current!, 'bottom-right') } catch (e) { }
        }
        return () => {
            if (controlRef.current) {
                try { map.removeControl(controlRef.current) } catch (e) { }
                controlRef.current = null
            }
        }
    }, [map])

    return null
}

export default UserGeolocate
