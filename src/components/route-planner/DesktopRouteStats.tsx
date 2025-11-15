import { useMemo } from 'react'

function formatEta(seconds: number) {
    const mins = Math.round(seconds / 60)
    return `${mins} min`
}

function formatDistance(meters: number) {
    if (meters < 1000) return `${Math.round(meters)} m`
    return `${(meters / 1000).toFixed(1)} km`
}

export default function DesktopRouteStats({
    distance,
    time,
    arrivalTime,
}: {
    distance: number
    time: number
    arrivalTime?: Date | null
}) {
    const eta = formatEta(time)
    const dist = formatDistance(distance)
    const arrStr = useMemo(
        () => (arrivalTime ? arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null),
        [arrivalTime]
    )

    return (
        <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-0.5">Durée</div>
                <div className="font-bold text-sm">{eta}</div>
            </div>
            <div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-0.5">Distance</div>
                <div className="font-bold text-sm">{dist}</div>
            </div>
            <div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-0.5">Arrivée</div>
                <div className="font-bold text-sm">{arrStr ?? '-'}</div>
            </div>
        </div>
    )
}
