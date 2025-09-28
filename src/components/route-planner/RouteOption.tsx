export default function RouteOption({ route, primary, highlighted, onHover, onLeave, onGo }: any) {
    const minutes = Math.round((route.time || 0) / 60)
    const meters = Math.round(route.distance || 0)
    const color = primary ? '#ff0000' : (route.index === 1 ? '#999999' : '#cccccc')
    return (
        <div onMouseEnter={() => onHover(route)} onMouseLeave={() => onLeave(route)} onClick={() => onGo(route)} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
            background: highlighted ? 'var(--route-item-bg-hover, #2a2d33)' : (primary ? 'var(--route-item-bg-primary, #262a30)' : 'var(--route-item-bg, #1f2329)'),
            border: highlighted ? '1px solid var(--route-item-border-hover, #3a3f46)' : (primary ? '1px solid var(--route-item-border-primary, #363b44)' : '1px solid var(--route-item-border, #2b2f36)')
        }}>
            <div>
                <div style={{ fontWeight: 700, color: 'var(--panel-fg, #111)' }}>{primary ? 'Plus court' : `Alternative ${route.index}`}</div>
                <div style={{ fontSize: 12, color: 'var(--list-item-muted, #888)' }}>{meters} m • {minutes} min</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 6, background: color, opacity: primary ? 1 : 0.6 }} />
                <button style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)' }} onClick={(e) => { e.stopPropagation(); onGo(route) }}>Go</button>
            </div>
        </div>
    )
}
