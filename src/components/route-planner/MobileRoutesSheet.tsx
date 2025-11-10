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
        <BottomSheetBase open={open} header={<div style={{ fontWeight: 700 }}>Itinéraires</div>} initialSnap={0.5} snapPercents={[0.05, 0.2, 0.5, 0.9]} minPeekPx={40}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {routes.map((r, i) => {
                    const primary = i === 0
                    const color = primary ? '#007bff' : (i === 1 ? 'var(--list-item-muted, #999)' : 'var(--panel-border, #ccc)')
                    return (
                        <button key={r.id} onClick={() => onSelect(r)} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 12,
                            border: '1px solid var(--panel-border, #e3e3e3)',
                            background: 'var(--panel-bg, #fff)', color: 'var(--panel-fg, #111)'
                        }}>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 700 }}>{primary ? 'Plus court' : `Alternative ${i}`}</div>
                                <div style={{ fontSize: 12, color: 'var(--list-item-muted, #666)' }}>{formatDistance(r.distance)} • {formatEta(r.time)}</div>
                            </div>
                            <div style={{ width: 14, height: 14, borderRadius: 7, background: color }} />
                        </button>
                    )
                })}
            </div>
        </BottomSheetBase>
    )
}
