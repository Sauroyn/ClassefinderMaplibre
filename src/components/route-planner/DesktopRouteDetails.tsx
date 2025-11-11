import { ArrowLeft } from '@gravity-ui/icons'
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
        <div className="w-full border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            {/* Header avec bouton retour */}
            <div className="flex items-center mb-3">
                <button
                    onClick={onBack}
                    aria-label="Retour"
                    title="Retour"
                    className="mr-2 bg-transparent border-none text-gray-900 dark:text-gray-100 text-lg cursor-pointer p-1 flex items-center hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 font-bold" />
                </button>
                <div className="font-bold text-[15px]">Détails de l'itinéraire</div>
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
