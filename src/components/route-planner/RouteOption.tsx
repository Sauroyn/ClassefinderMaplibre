export default function RouteOption({ route, primary, highlighted, onHover, onLeave, onGo }: any) {
    const minutes = Math.round((route.time || 0) / 60)
    const meters = Math.round(route.distance || 0)
    const color = primary ? '#ff0000' : (route.index === 1 ? '#999999' : '#cccccc')
    return (
        <div onMouseEnter={() => onHover(route)} onMouseLeave={() => onLeave(route)} onClick={() => onGo(route)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6, background: highlighted ? '#fff8e6' : (primary ? '#fff8f8' : '#fafafa'), cursor: 'pointer', border: highlighted ? '1px solid #ffe8c8' : (primary ? '1px solid #ffecec' : '1px solid #f0f0f0') }}>
            <div>
                <div style={{ fontWeight: 700 }}>{primary ? 'Plus court' : `Alternative ${route.index}`}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{meters} m • {minutes} min</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: color, opacity: primary ? 1 : 0.6 }} />
                <button style={{ padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); onGo(route) }}>Go</button>
            </div>
        </div>
    )
}
