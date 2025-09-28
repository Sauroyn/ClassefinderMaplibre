export default function Suggestions(props: {
    focusedField: 'start' | 'end' | null,
    startQuery: string,
    endQuery: string,
    nodeOptions: Array<{ id: string, name: string, level?: string }>,
    onSelectStart: (id: string, name: string) => void,
    onSelectEnd: (id: string, name: string) => void
}) {
    const { focusedField, startQuery, endQuery, nodeOptions, onSelectStart, onSelectEnd } = props

    if (!focusedField) return null

    if (focusedField === 'start') {
        const list = nodeOptions.filter(n => (n.name || n.id).toLowerCase().includes((startQuery || '').toLowerCase()))
        return (<div style={{ width: '100%' }}>
            <div key={`s-mapos`} onMouseDown={async () => {
                try {
                    await new Promise<void>((resolve) => {
                        navigator.geolocation.getCurrentPosition(() => resolve(), () => resolve(), { enableHighAccuracy: true, maximumAge: 30000, timeout: 6000 })
                    })
                } catch { }
                onSelectStart('USER_POSITION', 'Ma position')
            }} style={{ padding: 8, borderBottom: '1px solid #f2f2f2', cursor: 'pointer', fontWeight: 600 }}>Ma position</div>
            {list.map(n => (
            <div key={`s-${n.id}`} onMouseDown={() => onSelectStart(n.id, n.name)} style={{ padding: 8, borderBottom: '1px solid #f2f2f2', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>{n.name}<span style={{ color: '#666' }}>{n.level || ''}</span></div>
            ))}
        </div>)
    }

    if (focusedField === 'end') {
        const list = nodeOptions.filter(n => (n.name || n.id).toLowerCase().includes((endQuery || '').toLowerCase()))
        return (<div style={{ width: '100%' }}>
            <div key={`e-mapos`} onMouseDown={async () => {
                try {
                    await new Promise<void>((resolve) => {
                        navigator.geolocation.getCurrentPosition(() => resolve(), () => resolve(), { enableHighAccuracy: true, maximumAge: 30000, timeout: 6000 })
                    })
                } catch { }
                onSelectEnd('USER_POSITION', 'Ma position')
            }} style={{ padding: 8, borderBottom: '1px solid #f2f2f2', cursor: 'pointer', fontWeight: 600 }}>Ma position</div>
            {list.map(n => (
            <div key={`e-${n.id}`} onMouseDown={() => onSelectEnd(n.id, n.name)} style={{ padding: 8, borderBottom: '1px solid #f2f2f2', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>{n.name}<span style={{ color: '#666' }}>{n.level || ''}</span></div>
            ))}
        </div>)
    }

    return null
}
