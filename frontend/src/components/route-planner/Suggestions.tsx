import { LocationArrow, MapPin, ArrowLeft } from '@gravity-ui/icons'

function dispatchHover(id?: string | number) {
    try {
        if (id === undefined || id === null) {
            window.dispatchEvent(new CustomEvent('map:hover-clear'))
        } else {
            window.dispatchEvent(new CustomEvent('map:hover-feature', { detail: id }))
        }
    } catch { }
}

type GroupView = { field: 'start' | 'end'; title: string; items: Array<{ id: string | number; name: string; level?: string }> }

export default function Suggestions(props: {
    focusedField: 'start' | 'end' | null,
    startQuery: string,
    endQuery: string,
    nodeOptions: Array<{ id: string, name: string, level?: string, provisional?: boolean, featureIndex?: number, searchKey?: string }>,
    onSelectStart: (id: string, name: string) => void,
    onSelectEnd: (id: string, name: string) => void,
    onRequestGroup?: (field: 'start' | 'end', name: string, items: Array<{ id: string, name: string, level?: string }>) => void,
    groupView?: GroupView | null,
    onCloseGroup?: () => void
}) {
    const { focusedField, startQuery, endQuery, nodeOptions, onSelectStart, onSelectEnd, onRequestGroup, groupView, onCloseGroup } = props

    const hasGroupView = !!(groupView && groupView.items && groupView.items.length > 0)
    if (!focusedField && !hasGroupView) return null

    const handleSelect = (field: 'start' | 'end', item: any, groupSize?: number) => {
        const selector = field === 'start' ? onSelectStart : onSelectEnd

        // If multiple items share the same name (group), open the group selector like SearchBar
        if ((groupSize || 0) > 1 && onRequestGroup) {
            const sameNameAll = nodeOptions.filter(n =>
                String(n.name || '').toLowerCase().trim() === String(item.name || '').toLowerCase().trim()
            )
            onRequestGroup(field, item.name, sameNameAll.map(n => ({ id: n.id, name: n.name, level: n.level })))
            return
        }

        selector(item.id, item.name)
    }

    if (hasGroupView && groupView) {
        const { field, title, items } = groupView
        return (
            <div className="w-full">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <button
                        className="w-8 h-8 rounded-lg border border-transparent bg-transparent text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                        onClick={() => { if (onCloseGroup) onCloseGroup() }}
                        title="Retour"
                        aria-label="Retour"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate flex-1">{title} ({items.length})</div>
                </div>
                <div>
                    {items.map((item, idx) => (
                        <div
                            key={`group-item-${item.id}`}
                            onMouseEnter={() => dispatchHover(item.id)}
                            onMouseLeave={() => dispatchHover(undefined)}
                            onMouseDown={() => { handleSelect(field, item, 1); if (onCloseGroup) onCloseGroup() }}
                            className={`p-2 ${idx !== items.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''} cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <div className="text-gray-900 dark:text-gray-100 truncate font-semibold">{item.name}</div>
                                </div>
                            </div>
                            {item.level && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ml-2 flex-shrink-0">Étage {item.level}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    if (focusedField === 'start') {
        const q = (startQuery || '').toLowerCase()
        const list = nodeOptions.filter(n => (n.searchKey || (n.name || n.id).toLowerCase()).includes(q))

        // Group ALL items by lowercased name (provisional or not)
        const groupedMap = new Map<string, typeof list>()
        const firstByName = new Map<string, typeof list[number]>()
        for (const item of list) {
            const key = String(item.name || '').toLowerCase().trim()
            const arr = groupedMap.get(key) || []
            arr.push(item)
            groupedMap.set(key, arr)
            if (!firstByName.has(key)) firstByName.set(key, item)
        }
        const uniqueList = Array.from(firstByName.values())

        return (<div className="w-full">
            <div
                key={`s-mapos`}
                onMouseDown={async () => {
                    try {
                        await new Promise<void>((resolve) => {
                            navigator.geolocation.getCurrentPosition(() => resolve(), () => resolve(), { enableHighAccuracy: true, maximumAge: 30000, timeout: 6000 })
                        })
                    } catch { }
                    onSelectStart('USER_POSITION', 'Ma position')
                }}
                className="p-2 border-b border-gray-100 dark:border-gray-700 cursor-pointer font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
                <LocationArrow className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="flex-1">Ma position</span>
            </div>
            {uniqueList.map((n, idx) => {
                const key = n.name.toLowerCase().trim()
                const groupCount = groupedMap.get(key)?.length || 0
                const isGrouped = groupCount > 1
                const isLast = idx === uniqueList.length - 1
                return (
                    <div
                        key={`s-${n.id}`}
                        onMouseEnter={() => n.featureIndex != null ? dispatchHover(n.featureIndex) : undefined}
                        onMouseLeave={() => dispatchHover(undefined)}
                        onMouseDown={() => handleSelect('start', n, isGrouped ? groupCount : 1)}
                        className={`p-2 ${!isLast ? 'border-b border-gray-100 dark:border-gray-700' : ''} cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            {isGrouped ? null : <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />}
                            <div className="min-w-0 flex-1">
                                <div className="text-gray-900 dark:text-gray-100 truncate font-semibold">{n.name}{isGrouped && <span className="ml-1.5 text-xs opacity-70">({groupCount})</span>}</div>
                            </div>
                        </div>
                        {!isGrouped && n.level && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ml-2 flex-shrink-0">Étage {n.level}</span>
                        )}
                    </div>
                )
            })}
        </div>)
    }

    if (focusedField === 'end') {
        const q = (endQuery || '').toLowerCase()
        const list = nodeOptions.filter(n => (n.searchKey || (n.name || n.id).toLowerCase()).includes(q))

        // Group ALL items by lowercased name (provisional or not)
        const groupedMap = new Map<string, typeof list>()
        const firstByName = new Map<string, typeof list[number]>()
        for (const item of list) {
            const key = String(item.name || '').toLowerCase().trim()
            const arr = groupedMap.get(key) || []
            arr.push(item)
            groupedMap.set(key, arr)
            if (!firstByName.has(key)) firstByName.set(key, item)
        }
        const uniqueList = Array.from(firstByName.values())

        return (<div className="w-full">
            <div
                key={`e-mapos`}
                onMouseDown={async () => {
                    try {
                        await new Promise<void>((resolve) => {
                            navigator.geolocation.getCurrentPosition(() => resolve(), () => resolve(), { enableHighAccuracy: true, maximumAge: 30000, timeout: 6000 })
                        })
                    } catch { }
                    onSelectEnd('USER_POSITION', 'Ma position')
                }}
                className="p-2 border-b border-gray-100 dark:border-gray-700 cursor-pointer font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
                <LocationArrow className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <span className="flex-1">Ma position</span>
            </div>
            {uniqueList.map((n, idx) => {
                const key = n.name.toLowerCase().trim()
                const groupCount = groupedMap.get(key)?.length || 0
                const isGrouped = groupCount > 1
                const isLast = idx === uniqueList.length - 1
                return (
                    <div
                        key={`e-${n.id}`}
                        onMouseEnter={() => n.featureIndex != null ? dispatchHover(n.featureIndex) : undefined}
                        onMouseLeave={() => dispatchHover(undefined)}
                        onMouseDown={() => handleSelect('end', n, isGrouped ? groupCount : 1)}
                        className={`p-2 ${!isLast ? 'border-b border-gray-100 dark:border-gray-700' : ''} cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            {isGrouped ? null : <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />}
                            <div className="min-w-0 flex-1">
                                <div className="text-gray-900 dark:text-gray-100 truncate font-semibold">{n.name}{isGrouped && <span className="ml-1.5 text-xs opacity-70">({groupCount})</span>}</div>
                            </div>
                        </div>
                        {!isGrouped && n.level && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ml-2 flex-shrink-0">Étage {n.level}</span>
                        )}
                    </div>
                )
            })}
        </div>)
    }

    return null
}
