import React from 'react'

type Props = {
    excludeStairs: boolean
    coveredOnly: boolean
    showSecondary: boolean
    onChangeExcludeStairs: (v: boolean) => void
    onChangeCoveredOnly: (v: boolean) => void
    onChangeShowSecondary: (v: boolean) => void
    onApply: () => void
    style?: React.CSSProperties
}

export default function SettingsPopover({ excludeStairs, coveredOnly, showSecondary, onChangeExcludeStairs, onChangeCoveredOnly, onChangeShowSecondary, onApply, style }: Props) {
    return (
        <div style={{ position: 'absolute', right: 12, top: 40, background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)', border: '1px solid var(--panel-border, #ddd)', padding: 8, borderRadius: 8, zIndex: 30, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', ...style }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13 }}><input type="checkbox" checked={excludeStairs} onChange={(e) => onChangeExcludeStairs(e.target.checked)} />{' '}Mode fauteuil roulant (sans escaliers)</label>
                <label style={{ fontSize: 13 }}><input type="checkbox" checked={coveredOnly} onChange={(e) => onChangeCoveredOnly(e.target.checked)} />{' '}Couvert uniquement</label>
                <label style={{ fontSize: 13 }}><input type="checkbox" checked={showSecondary} onChange={(e) => onChangeShowSecondary(e.target.checked)} />{' '}Afficher itinéraires secondaires</label>
                <div style={{ fontSize: 12, color: 'var(--list-item-muted, #666)' }}><strong>Filtres actifs :</strong> {excludeStairs ? 'Sans escaliers' : '—'}{', '}{coveredOnly ? 'Couvert' : '—'}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={onApply} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)' }}>Appliquer</button>
                </div>
            </div>
        </div>
    )
}
