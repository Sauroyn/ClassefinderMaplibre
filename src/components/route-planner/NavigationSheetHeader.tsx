import { Gear } from '@gravity-ui/icons'

export function NavigationSheetHeader({ totalDist, totalTime, onOpenSettings, onFinish }: { totalDist: string, totalTime: string, onOpenSettings?: () => void, onFinish: () => void }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex gap-2 items-baseline">
                <div className="font-bold">Trajet en cours</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{totalDist} • {totalTime}</div>
            </div>
            <div className="flex gap-2">
                <button
                    aria-label="Paramètres"
                    title="Paramètres"
                    onClick={onOpenSettings}
                    className="border border-gray-300 dark:border-gray-700 bg-transparent rounded-lg px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <Gear className="w-4 h-4" />
                </button>
                <button
                    onClick={onFinish}
                    className="border-none bg-red-500 hover:bg-red-600 text-white rounded-lg px-2.5 py-1.5 font-bold transition-colors"
                >
                    Finir
                </button>
            </div>
        </div>
    )
}
