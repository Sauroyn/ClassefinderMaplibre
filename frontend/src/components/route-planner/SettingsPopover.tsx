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
        <div className="absolute right-3 top-10 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 p-2 rounded-lg z-[30] shadow-md" style={style}>
            <div className="flex flex-col gap-2">
                <label className="text-[13px] flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={excludeStairs} onChange={(e) => onChangeExcludeStairs(e.target.checked)} className="accent-blue-600 dark:accent-blue-500" /> Mode fauteuil roulant (sans escaliers)</label>
                <label className="text-[13px] flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={coveredOnly} onChange={(e) => onChangeCoveredOnly(e.target.checked)} className="accent-blue-600 dark:accent-blue-500" /> Couvert uniquement</label>
                <label className="text-[13px] flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={showSecondary} onChange={(e) => onChangeShowSecondary(e.target.checked)} className="accent-blue-600 dark:accent-blue-500" /> Afficher itinéraires secondaires</label>
                <div className="text-xs text-gray-600 dark:text-gray-400"><strong>Filtres actifs :</strong> {excludeStairs ? 'Sans escaliers' : '—'}{', '}{coveredOnly ? 'Couvert' : '—'}</div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onApply} className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">Appliquer</button>
                </div>
            </div>
        </div>
    )
}
