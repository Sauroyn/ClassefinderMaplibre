import { BottomSheetBase } from './BottomSheetBase'
import type { RouteItem } from './MobileSheets'
import { formatEta, formatDistance } from './MobileSheets'

export function MobileRoutesSheet({
    routes,
    open,
    onSelect,
}: {
    routes: RouteItem[]
    open: boolean
    onSelect: (rt: RouteItem) => void
}) {
    return (
        <BottomSheetBase open={open} header={<div className="font-bold">Itinéraires</div>} initialSnap={0.5} snapPercents={[0.05, 0.2, 0.5, 0.9]} minPeekPx={40}>
            <div className="flex flex-col gap-2">
                {routes.map((r, i) => {
                    const primary = i === 0
                    const color = primary ? '#007bff' : (i === 1 ? 'rgb(153 153 153 / 1)' : 'rgb(204 204 204 / 1)')
                    return (
                        <button
                            key={r.id}
                            onClick={() => onSelect(r)}
                            className="flex justify-between items-center px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="text-left">
                                <div className="font-bold">{primary ? 'Plus court' : `Alternative ${i}`}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">{formatDistance(r.distance)} • {formatEta(r.time)}</div>
                            </div>
                            <div className="w-3.5 h-3.5 rounded-full" style={{ background: color }} />
                        </button>
                    )
                })}
            </div>
        </BottomSheetBase>
    )
}
