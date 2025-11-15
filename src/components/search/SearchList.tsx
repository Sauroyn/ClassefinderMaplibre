import { MapPin } from '@gravity-ui/icons'

type Item = { id: string | number; name: string; level?: string | number; buildingLabel?: string; isRecent?: boolean }
type ListEntry =
    | { type: 'single'; item: Item; isRecent?: boolean }
    | { type: 'group'; name: string; items: Item[] }

function dispatchHover(id?: string | number) {
    try {
        if (id === undefined || id === null) {
            window.dispatchEvent(new CustomEvent('map:hover-clear'))
        } else {
            window.dispatchEvent(new CustomEvent('map:hover-feature', { detail: id }))
        }
    } catch { }
}

function dispatchHoverMany(ids: Array<string | number> | null | undefined) {
    try {
        if (!ids || ids.length === 0) {
            window.dispatchEvent(new CustomEvent('map:hover-clear'))
        } else {
            window.dispatchEvent(new CustomEvent('map:hover-features', { detail: ids }))
        }
    } catch { }
}

export default function SearchList({ items, onPick, onOpenGroup }: { items: ListEntry[]; onPick: (id: string | number, name: string) => void, onOpenGroup?: (name: string, items: Item[]) => void }) {
    return (
        <div className="overflow-hidden" onMouseLeave={() => { dispatchHover(undefined) }}>
            {items.map((entry, idx) => {
                if (entry.type === 'single') {
                    const it = entry.item
                    return (
                        <div
                            key={`single-${String(it.id)}`}
                            onMouseEnter={() => dispatchHover(it.id)}
                            onMouseLeave={() => dispatchHover(undefined)}
                            onMouseDown={() => onPick(it.id, it.name)}
                            className="flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <MapPin className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{it.name}</div>
                                    {it.buildingLabel && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{it.buildingLabel}</div>
                                    )}
                                </div>
                            </div>
                            {it.level != null ? (
                                <div className="self-center opacity-90 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl text-sm ml-2 flex-shrink-0">
                                    <span>Étage {it.level}</span>
                                </div>
                            ) : (
                                <div className="w-9 flex-shrink-0" />
                            )}
                        </div>
                    )
                }
                return (
                    <div key={`group-${entry.name}-${idx}`}>
                        <div
                            onMouseEnter={() => dispatchHoverMany(entry.items.map(i => i.id))}
                            onMouseLeave={() => dispatchHover(undefined)}
                            onMouseDown={() => { if (onOpenGroup) onOpenGroup(entry.name, entry.items) }}
                            className="flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="font-bold text-gray-900 dark:text-gray-100 truncate">{entry.name}</div>
                                <div className="opacity-75 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">({entry.items.length})</div>
                            </div>
                            <div className="w-9 flex-shrink-0" />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
