import { findByNormalizedId } from '../../utils/featureId'
import { getAlias } from '../../utils/aliases'
import { Route, Pencil } from '@gravity-ui/icons'

type Item = { id: string | number; name: string; level?: string | number }

export default function SearchSelected({ selected, onRoute, data, onOpenAliasSettings }: { selected: Item | null; onRoute?: (feat: any) => void; data?: GeoJSON.FeatureCollection | null; onOpenAliasSettings?: (featureId: string | number, originalName: string) => void }) {
    if (!selected) return null
    const feat = findByNormalizedId(data as any, selected.id)
    const alias = getAlias(selected.id)

    // Determine if feature has a name (original OR alias) to show itinerary button
    const originalName = feat?.properties?.name
    const hasRealName = (originalName && typeof originalName === 'string' && originalName.trim().length > 0) || !!alias

    return (
        <div className="mt-2 p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start gap-2">
                <div>
                    <div className="font-bold">{selected.name}</div>
                    {alias && alias.originalName && (
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            Alias de "{alias.originalName}"
                        </div>
                    )}
                    {alias && !alias.originalName && (
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            Alias
                        </div>
                    )}
                </div>
                {selected.level != null && (
                    <div className="px-2.5 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl text-sm flex-shrink-0">Étage {selected.level}</div>
                )}
            </div>
            <div className="mt-1.5 flex gap-2">
                {hasRealName && (
                    <button
                        className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
                        onClick={() => {
                            if (!onRoute) return
                            // Passer l'objet avec le nom effectif (alias ou original)
                            onRoute({
                                ...feat,
                                id: selected.id,
                                properties: {
                                    ...feat?.properties,
                                    name: selected.name // Utiliser le nom affiché (alias ou original)
                                }
                            })
                        }}
                    >
                        <Route className="w-4 h-4" />
                        <span>Itinéraire</span>
                    </button>
                )}
                <button
                    className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
                    onClick={() => {
                        if (onOpenAliasSettings) {
                            const originalName = feat?.properties?.name || ''
                            onOpenAliasSettings(selected.id, originalName)
                        }
                    }}
                >
                    <Pencil className="w-4 h-4" />
                    <span>{alias ? 'Modifier alias' : 'Alias'}</span>
                </button>
            </div>
        </div>
    )
}
