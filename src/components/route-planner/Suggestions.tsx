function dispatchHover(id?: string | number) {
    try {
        if (id === undefined || id === null) {
            window.dispatchEvent(new CustomEvent('map:hover-clear'))
        } else {
            window.dispatchEvent(new CustomEvent('map:hover-feature', { detail: id }))
        }
    } catch { }
}

export default function Suggestions(props: {
    focusedField: 'start' | 'end' | null,
    startQuery: string,
    endQuery: string,
    nodeOptions: Array<{ id: string, name: string, level?: string, provisional?: boolean, featureIndex?: number }>,
    onSelectStart: (id: string, name: string) => void,
    onSelectEnd: (id: string, name: string) => void,
    onRequestGroup?: (field: 'start' | 'end', name: string, items: Array<{ id: string, name: string, level?: string }>) => void
}) {
    const { focusedField, startQuery, endQuery, nodeOptions, onSelectStart, onSelectEnd, onRequestGroup } = props

    if (!focusedField) return null

    const handleSelect = (field: 'start' | 'end', item: any) => {
        const selector = field === 'start' ? onSelectStart : onSelectEnd

        console.log('[Suggestions] handleSelect:', { field, item, provisional: item.provisional })

        // Check if this name has multiple features (provisional only)
        if (item.provisional) {
            const sameName = nodeOptions.filter(n =>
                n.provisional &&
                n.name.toLowerCase().trim() === item.name.toLowerCase().trim()
            )
            console.log('[Suggestions] sameName count:', sameName.length)
            if (sameName.length > 1 && onRequestGroup) {
                // Show group selection
                console.log('[Suggestions] Opening group menu')
                onRequestGroup(field, item.name, sameName.map(n => ({
                    id: n.id,
                    name: n.name,
                    level: n.level
                })))
                return
            }
        }

        console.log('[Suggestions] Direct selection:', item.id, item.name)
        selector(item.id, item.name)
    }

    if (focusedField === 'start') {
        const list = nodeOptions.filter(n => (n.name || n.id).toLowerCase().includes((startQuery || '').toLowerCase()))

        // Group provisional items by name
        const groupedMap = new Map<string, typeof list>()
        const uniqueList: typeof list = []

        for (const item of list) {
            if (item.provisional) {
                const key = item.name.toLowerCase().trim()
                if (!groupedMap.has(key)) {
                    groupedMap.set(key, [])
                    uniqueList.push(item) // Add first occurrence
                }
                groupedMap.get(key)!.push(item)
            } else {
                uniqueList.push(item) // Non-provisional items always shown
            }
        }

        return (<div style={{ width: '100%' }}>
            <div key={`s-mapos`} onMouseDown={async () => {
                try {
                    await new Promise<void>((resolve) => {
                        navigator.geolocation.getCurrentPosition(() => resolve(), () => resolve(), { enableHighAccuracy: true, maximumAge: 30000, timeout: 6000 })
                    })
                } catch { }
                onSelectStart('USER_POSITION', 'Ma position')
            }} style={{ padding: 8, borderBottom: '1px solid #f2f2f2', cursor: 'pointer', fontWeight: 600 }}>Ma position</div>
            {uniqueList.map(n => {
                const isGrouped = n.provisional && groupedMap.has(n.name.toLowerCase().trim()) && groupedMap.get(n.name.toLowerCase().trim())!.length > 1
                return (
                    <div
                        key={`s-${n.id}`}
                        onMouseEnter={() => n.provisional && n.featureIndex != null ? dispatchHover(n.featureIndex) : undefined}
                        onMouseLeave={() => dispatchHover(undefined)}
                        onMouseDown={() => handleSelect('start', n)}
                        style={{ padding: 8, borderBottom: '1px solid #f2f2f2', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                    >
                        <span>
                            {n.name}
                            {isGrouped && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>({groupedMap.get(n.name.toLowerCase().trim())!.length})</span>}
                        </span>
                        <span style={{ color: '#666' }}>{n.level || ''}</span>
                    </div>
                )
            })}
        </div>)
    }

    if (focusedField === 'end') {
        const list = nodeOptions.filter(n => (n.name || n.id).toLowerCase().includes((endQuery || '').toLowerCase()))

        // Group provisional items by name
        const groupedMap = new Map<string, typeof list>()
        const uniqueList: typeof list = []

        for (const item of list) {
            if (item.provisional) {
                const key = item.name.toLowerCase().trim()
                if (!groupedMap.has(key)) {
                    groupedMap.set(key, [])
                    uniqueList.push(item) // Add first occurrence
                }
                groupedMap.get(key)!.push(item)
            } else {
                uniqueList.push(item) // Non-provisional items always shown
            }
        }

        return (<div style={{ width: '100%' }}>
            <div key={`e-mapos`} onMouseDown={async () => {
                try {
                    await new Promise<void>((resolve) => {
                        navigator.geolocation.getCurrentPosition(() => resolve(), () => resolve(), { enableHighAccuracy: true, maximumAge: 30000, timeout: 6000 })
                    })
                } catch { }
                onSelectEnd('USER_POSITION', 'Ma position')
            }} style={{ padding: 8, borderBottom: '1px solid #f2f2f2', cursor: 'pointer', fontWeight: 600 }}>Ma position</div>
            {uniqueList.map(n => {
                const isGrouped = n.provisional && groupedMap.has(n.name.toLowerCase().trim()) && groupedMap.get(n.name.toLowerCase().trim())!.length > 1
                return (
                    <div
                        key={`e-${n.id}`}
                        onMouseEnter={() => n.provisional && n.featureIndex != null ? dispatchHover(n.featureIndex) : undefined}
                        onMouseLeave={() => dispatchHover(undefined)}
                        onMouseDown={() => handleSelect('end', n)}
                        style={{ padding: 8, borderBottom: '1px solid #f2f2f2', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                    >
                        <span>
                            {n.name}
                            {isGrouped && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>({groupedMap.get(n.name.toLowerCase().trim())!.length})</span>}
                        </span>
                        <span style={{ color: '#666' }}>{n.level || ''}</span>
                    </div>
                )
            })}
        </div>)
    }

    return null
}
