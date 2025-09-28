type Item = { id: string | number; name: string; level?: string | number }

export default function SearchList({ items, onPick }: { items: Item[]; onPick: (id: string | number, name: string) => void }) {
    return (
        <>
            {items.map((it) => (
                <div key={String(it.id)} onMouseDown={() => onPick(it.id, it.name)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid var(--panel-border, #2a2d33)', cursor: 'pointer' }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>{it.name}</div>
                    </div>
                    {it.level != null ? (
                        <div style={{ alignSelf: 'center', opacity: 0.9, padding: '4px 8px', background: 'var(--chip-bg, #f1f3f5)', color: 'var(--chip-fg, #111)', borderRadius: 12 }}>{it.level}</div>
                    ) : (
                        <div style={{ width: 36 }} />
                    )}
                </div>
            ))}
        </>
    )
}
