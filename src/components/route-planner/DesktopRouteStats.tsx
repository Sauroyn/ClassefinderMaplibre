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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
                <div style={{ fontSize: 11, color: 'var(--list-item-muted, #666)', marginBottom: 2 }}>Durée</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{eta}</div>
            </div>
            <div>
                <div style={{ fontSize: 11, color: 'var(--list-item-muted, #666)', marginBottom: 2 }}>Distance</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{dist}</div>
            </div>
            <div>
                <div style={{ fontSize: 11, color: 'var(--list-item-muted, #666)', marginBottom: 2 }}>Arrivée</div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{arrStr ?? '-'}</div>
            </div>
        </div>
    )
}
