type Props = {
    name: string
    level?: string | number
}

export default function ResultActions({ name }: Props) {
    return (
        <div style={{ marginTop: 8, padding: 10, background: '#fbfbfb', borderRadius: 6, boxShadow: 'inset 0 0 0 1px #eee' }}>
            <div style={{ fontWeight: 700 }}>{name}</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                <button style={{ padding: '6px 10px' }}>Itinéraire</button>
                <button style={{ padding: '6px 10px' }}>Alias</button>
            </div>
        </div>
    )
}
