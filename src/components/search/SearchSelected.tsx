import { findByNormalizedId } from '../../utils/featureId'

type Item = { id: string | number; name: string; level?: string | number }

export default function SearchSelected({ selected, onRoute, data }: { selected: Item | null; onRoute?: (feat: any) => void; data?: GeoJSON.FeatureCollection | null }) {
    if (!selected) return null
    const feat = findByNormalizedId(data as any, selected.id)
    // Determine if feature has a name (not auto-generated)
    const hasRealName = feat && feat.properties && feat.properties.name && typeof feat.properties.name === 'string' && feat.properties.name.trim().length > 0
    return (
        <div style={{ marginTop: 8, padding: 10, background: 'var(--panel-bg, #fbfbfb)', color: 'var(--panel-fg, #111)', borderRadius: 8, boxShadow: 'inset 0 0 0 1px var(--panel-border, #eee)' }}>
            <div style={{ fontWeight: 700 }}>{selected.name}</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                <div style={{ padding: '6px 10px', background: 'var(--chip-bg, #f1f3f5)', color: 'var(--chip-fg, #111)', borderRadius: 12 }}>{selected.level ?? '—'}</div>
                {hasRealName && (
                    <button
                        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)' }}
                        onClick={() => { if (!onRoute) return; onRoute(feat || { id: selected.id, name: selected.name }) }}
                    >
                        Itinéraire
                    </button>
                )}
                <button style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)' }}>Alias</button>
            </div>
        </div>
    )
}
