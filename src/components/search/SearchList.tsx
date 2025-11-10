

type Item = { id: string | number; name: string; level?: string | number }
type ListEntry =
    | { type: 'single'; item: Item }
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
        <div onMouseLeave={() => { dispatchHover(undefined) }}>
            {items.map((entry, idx) => {
                if (entry.type === 'single') {
                    const it = entry.item
                    return (
                        <div
                            key={`single-${String(it.id)}`}
                            onMouseEnter={() => dispatchHover(it.id)}
                            onMouseLeave={() => dispatchHover(undefined)}
                            onMouseDown={() => onPick(it.id, it.name)}
                            style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--panel-border, #2a2d33)', cursor: 'pointer' }}
                        >
                            <div>
                                <div style={{ fontWeight: 600 }}>{it.name}</div>
                            </div>
                            {it.level != null ? (
                                <div style={{ alignSelf: 'center', opacity: 0.9, padding: '4px 8px', background: 'var(--chip-bg, #f1f3f5)', color: 'var(--chip-fg, #111)', borderRadius: 12 }}>{it.level}</div>
                            ) : (
                                <div style={{ width: 36 }} />
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
                            style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--panel-border, #2a2d33)', cursor: 'pointer' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontWeight: 700 }}>{entry.name}</div>
                                <div style={{ opacity: 0.75, fontSize: 12 }}>({entry.items.length})</div>
                            </div>
                            <div style={{ width: 36 }} />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
