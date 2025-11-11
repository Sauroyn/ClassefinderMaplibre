import ConfigSelector from '../ConfigSelector'
import AliasManager from './AliasManager'

export default function SettingsModal({
    theme,
    onChangeTheme,
    icalUrl,
    onChangeIcalUrl,
    bufferMin,
    onChangeBufferMin,
    eventsEnabled,
    onChangeEventsEnabled,
    onCancel,
    onSave,
    data,
    editingAliasFeatureId,
    editingAliasOriginalName,
}: {
    theme: 'light' | 'dark'
    onChangeTheme: (t: 'light' | 'dark') => void
    icalUrl: string
    onChangeIcalUrl: (v: string) => void
    bufferMin: number
    onChangeBufferMin: (n: number) => void
    eventsEnabled: boolean
    onChangeEventsEnabled: (v: boolean) => void
    onCancel: () => void
    onSave: () => void
    data?: GeoJSON.FeatureCollection | null
    editingAliasFeatureId?: string | number | null
    editingAliasOriginalName?: string
}) {
    return (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }}>
            <div style={{ position: 'relative', background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)', border: '1px solid var(--panel-border, #ddd)', borderRadius: 12, padding: 16, width: 'min(92vw, 560px)', boxShadow: '0 8px 28px rgba(0,0,0,0.25)' }}>
                <button onClick={onCancel} aria-label="Fermer" title="Fermer" style={{ position: 'absolute', right: 8, top: 8, background: 'transparent', border: 'none', fontSize: 18, color: 'var(--panel-fg, #111)', cursor: 'pointer' }}>✕</button>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>Paramètres</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ borderTop: '1px solid var(--panel-border, #ddd)', paddingTop: 12 }}>
                        <div style={{ fontSize: 13, marginBottom: 8 }}>Apparence</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => onChangeTheme('light')} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--btn-border, #ddd)', background: theme === 'light' ? 'var(--muted, #f1f3f5)' : 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)', cursor: 'pointer' }} aria-pressed={theme === 'light'}>Clair</button>
                            <button onClick={() => onChangeTheme('dark')} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--btn-border, #ddd)', background: theme === 'dark' ? 'var(--muted, #1f2329)' : 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)', cursor: 'pointer' }} aria-pressed={theme === 'dark'}>Sombre</button>
                        </div>
                    </div>

                    <ConfigSelector embedded />

                    <div style={{ borderTop: '1px solid var(--panel-border, #ddd)', paddingTop: 12 }}>
                        <div style={{ fontSize: 13, marginBottom: 6 }}>Lien iCal</div>
                        <input value={icalUrl} onChange={(e) => onChangeIcalUrl(e.target.value)} placeholder="https://...calType=ical" style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid var(--panel-border, #ddd)', background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)', opacity: eventsEnabled ? 1 : 0.6 }} />
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--chip-fg, #666)' }}>Laissez vide pour désactiver l’import iCal.</div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--panel-border, #ddd)', paddingTop: 12 }}>
                        <div style={{ fontSize: 13, marginBottom: 6 }}>Marge supplémentaire (minutes) pour départ utilisateur</div>
                        <input type="number" min={0} value={bufferMin} onChange={(e) => onChangeBufferMin(Math.max(0, Number(e.target.value)))} style={{ width: 160, padding: 8, borderRadius: 8, border: '1px solid var(--panel-border, #ddd)', background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)' }} />
                    </div>

                    <div style={{ borderTop: '1px solid var(--panel-border, #ddd)', paddingTop: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                            <input type="checkbox" checked={eventsEnabled} onChange={(e) => onChangeEventsEnabled(e.target.checked)} style={{ accentColor: 'var(--btn-border, #777)' }} />
                            Activer la fonctionnalité événements (sélecteur, iCal, pré‑calculs)
                        </label>
                    </div>

                    {/* Alias Management */}
                    <AliasManager
                        data={data || null}
                        editingFeatureId={editingAliasFeatureId}
                        editingOriginalName={editingAliasOriginalName}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--panel-border, #ddd)', paddingTop: 12 }}>
                        <button onClick={onCancel} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--panel-border, #ddd)', background: 'transparent', color: 'var(--panel-fg, #111)', cursor: 'pointer' }}>Annuler</button>
                        <button onClick={onSave} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)', cursor: 'pointer' }}>Enregistrer</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
