import DesktopRouteStats from './DesktopRouteStats'
import DesktopRouteSteps from './DesktopRouteSteps'

type RouteItem = {
    id: string
    layerId: string
    distance: number
    time: number
    steps?: Array<{
        distance: number
        coords: [number[], number[]]
        fromId?: string
        toId?: string
        type?: string
        direction?: string
        level?: number
    }>
    maneuvers?: Array<{ at: number; type: string; idx?: number }>
}

export default function DesktopRouteDetails({
    route,
    arrivalTime,
    onBack,
}: {
    route: RouteItem | null
    arrivalTime?: Date | null
    onBack: () => void
}) {
    if (!route) return null

    return (
        <div
            style={{
                width: '100%',
                borderTop: '1px solid var(--muted, #eee)',
                paddingTop: 12,
                marginTop: 12,
            }}
        >
            {/* Header avec bouton retour */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <button
                    onClick={onBack}
                    aria-label="Retour"
                    title="Retour"
                    style={{
                        marginRight: 8,
                        background: 'none',
                        border: 'none',
                        color: 'var(--panel-fg, #111)',
                        fontSize: 18,
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    <span style={{ fontWeight: 700 }}>&larr;</span>
                </button>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Détails de l'itinéraire</div>
            </div>

            {/* Stats de l'itinéraire */}
            <DesktopRouteStats distance={route.distance} time={route.time} arrivalTime={arrivalTime} />

            {/* Étapes de l'itinéraire */}
            {route.steps && route.steps.length > 0 && (
                <DesktopRouteSteps steps={route.steps} maneuvers={route.maneuvers} />
            )}
        </div>
    )
}
