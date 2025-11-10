

export default function ConfirmStartModal({ open, distance, onCancel, onAdjust }: { open: boolean, distance: number, onCancel: () => void, onAdjust: () => void }) {
    if (!open) return null
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
            <div style={{ maxWidth: 380, width: '90%', background: 'var(--panel-bg, #fff)', color: 'var(--panel-fg, #111)', borderRadius: 12, padding: 16, boxShadow: '0 12px 32px rgba(0,0,0,0.3)' }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Point de départ éloigné</div>
                <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 14 }}>
                    Le trajet doit commencer près de votre position. Le point de départ actuel est à environ {Math.round(distance)} m.
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={onCancel} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', background: 'var(--btn-bg, #fff)', color: 'var(--btn-fg, #111)' }}>OK</button>
                    <button onClick={onAdjust} style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: '#007bff', color: '#fff', fontWeight: 700 }}>Mettre le départ à ma position</button>
                </div>
            </div>
        </div>
    )
}
