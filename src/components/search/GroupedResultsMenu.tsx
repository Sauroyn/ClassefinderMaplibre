type Item = { id: string | number; name: string; level?: string | number }

function dispatchHover(id?: string | number) {
  try {
    if (id === undefined || id === null) {
      window.dispatchEvent(new CustomEvent('map:hover-clear'))
    } else {
      window.dispatchEvent(new CustomEvent('map:hover-feature', { detail: id }))
    }
  } catch { }
}

export default function GroupedResultsMenu({ title, items, onPick, onClose }: { title: string; items: Item[]; onPick: (id: string | number, name: string) => void; onClose: () => void }) {
  return (
    <div style={{ position: 'absolute', left: 12, top: 60, zIndex: 11, width: 360, background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)', border: '1px solid var(--panel-border, #ddd)', borderRadius: 8, boxShadow: '0 8px 18px rgba(0,0,0,0.22)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderBottom: '1px solid var(--panel-border, #eee)' }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)' }}>✕</button>
      </div>
      <div onMouseLeave={() => dispatchHover(undefined)}>
        {items.map((it) => (
          <div
            key={`group-menu-${String(it.id)}`}
            onMouseEnter={() => dispatchHover(it.id)}
            onMouseLeave={() => dispatchHover(undefined)}
            onMouseDown={() => { onPick(it.id, it.name); onClose() }}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 10px', borderBottom: '1px solid var(--panel-border, #f0f0f0)', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 700 }}>{it.name}</div>
              <div style={{ opacity: 0.8, fontSize: 12 }}>Niv. {it.level != null ? String(it.level) : '—'}</div>
            </div>
            <div style={{ alignSelf: 'center', opacity: 0.9, padding: '4px 8px', background: 'var(--chip-bg, #f1f3f5)', color: 'var(--chip-fg, #111)', borderRadius: 12 }}>#{String(it.id)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
