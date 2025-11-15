import type { BuildingFiltersState, BuildingFilterSettings, BuildingMeta } from '../../hooks/useConfigData'
import { createDefaultFilterFromMeta } from '../../hooks/useConfigData'

const numberFormat = new Intl.NumberFormat('fr-FR')

const levelComparator = (a: string, b: string) => {
    const numA = Number(a)
    const numB = Number(b)
    if (Number.isFinite(numA) && Number.isFinite(numB)) return numA - numB
    return a.localeCompare(b, 'fr', { numeric: true })
}

const formatTagLabel = (tag: string) => tag.replace(/[-_]/g, ' ').replace(/^(.)/, (m) => m.toUpperCase())

type Props = {
    buildingsMeta: BuildingMeta[]
    filters: BuildingFiltersState
    onChangeFilter: (buildingId: string, next: BuildingFilterSettings) => void
    onResetFilter: (buildingId: string) => void
    onResetAll: () => void
}

export default function BuildingSettings({ buildingsMeta, filters, onChangeFilter, onResetFilter, onResetAll }: Props) {
    if (!buildingsMeta || buildingsMeta.length === 0) {
        return (
            <div className="space-y-4">
                <div>
                    <h2 className="text-xl font-semibold mb-2">Gestion des bâtiments</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Cette configuration ne définit aucun bâtiment supplémentaire. Ajoutez des entrées dans votre fichier config pour activer la gestion fine des niveaux et des tags.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Gestion des bâtiments</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Activez/masquez des bâtiments, filtrez les niveaux visibles et restreignez l&apos;affichage à certains tags (ex. départements, équipements).
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onResetAll}
                    className="self-start rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                    Réinitialiser tout
                </button>
            </div>

            <div className="space-y-5">
                {buildingsMeta.map(meta => (
                    <BuildingCard
                        key={meta.id}
                        meta={meta}
                        filter={filters[meta.id] ?? createDefaultFilterFromMeta(meta)}
                        onChangeFilter={onChangeFilter}
                        onResetFilter={onResetFilter}
                    />
                ))}
            </div>
        </div>
    )
}

function BuildingCard({ meta, filter, onChangeFilter, onResetFilter }: {
    meta: BuildingMeta
    filter: BuildingFilterSettings
    onChangeFilter: (buildingId: string, next: BuildingFilterSettings) => void
    onResetFilter: (buildingId: string) => void
}) {
    const handleVisibilityToggle = (visible: boolean) => {
        onChangeFilter(meta.id, { ...filter, visible })
    }

    const handleSelectAllLevels = () => {
        onChangeFilter(meta.id, { ...filter, levels: 'all' })
    }

    const handleClearLevels = () => {
        onChangeFilter(meta.id, { ...filter, levels: [] })
    }

    const handleToggleLevel = (level: string) => {
        const set = new Set(filter.levels === 'all' ? meta.availableLevels : filter.levels)
        if (set.has(level)) set.delete(level)
        else set.add(level)
        const levelsArray = Array.from(set).sort(levelComparator)
        const nextLevels = levelsArray.length === meta.availableLevels.length ? 'all' : levelsArray
        onChangeFilter(meta.id, { ...filter, levels: nextLevels })
    }

    const selectedLevels = filter.levels === 'all'
        ? new Set(meta.availableLevels)
        : new Set(filter.levels)

    const disabledClass = filter.visible ? '' : 'opacity-50 pointer-events-none'

    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="text-lg font-semibold">{meta.label}</div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {numberFormat.format(meta.availableLevels.length)} niveaux · {numberFormat.format(meta.availableTags.length)} tags
                    </div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                    <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={filter.visible}
                        onChange={(e) => handleVisibilityToggle(e.target.checked)}
                    />
                    Afficher ce bâtiment
                </label>
            </div>

            <div className={`mt-5 space-y-6 ${disabledClass}`}>
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Niveaux visibles</h3>
                        <div className="flex gap-2 text-xs">
                            <button type="button" className="text-blue-600 hover:underline" onClick={handleSelectAllLevels}>Tout</button>
                            <button type="button" className="text-blue-600 hover:underline" onClick={handleClearLevels}>Aucun</button>
                        </div>
                    </div>
                    {meta.availableLevels.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun niveau détecté dans ce fichier.</p>
                    )}
                    {meta.availableLevels.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {meta.availableLevels.map(level => (
                                <label
                                    key={level}
                                    className={`px-3 py-1 rounded-full border text-xs cursor-pointer transition ${selectedLevels.has(level)
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-200'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={selectedLevels.has(level)}
                                        onChange={() => handleToggleLevel(level)}
                                    />
                                    Niveau {level}
                                </label>
                            ))}
                        </div>
                    )}
                </section>

                {meta.activeTags && meta.activeTags.length > 0 && (
                    <section>
                        <div className="mb-3">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Tags actifs</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Ces tags sont définis dans la configuration. Seuls les éléments possédant au moins un de ces tags sont affichés.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {meta.activeTags.map(tag => (
                                <span
                                    key={tag}
                                    className="px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-500 text-green-700 dark:text-green-200 text-xs font-medium"
                                >
                                    {formatTagLabel(tag)}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                <section>
                    <div className="mb-3">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Tags disponibles</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Propriétés détectées dans les données GeoJSON de ce bâtiment.
                        </p>
                    </div>
                    {meta.availableTags.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun tag détecté pour ce bâtiment.</p>
                    )}
                    {meta.availableTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {meta.availableTags.map(tag => (
                                <span
                                    key={tag}
                                    className="px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs"
                                >
                                    {formatTagLabel(tag)}
                                </span>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Les filtres sont enregistrés localement pour cette configuration. Fermez la fenêtre des paramètres pour appliquer les changements.
                </p>
                <button
                    type="button"
                    onClick={() => onResetFilter(meta.id)}
                    className="self-start rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                    Réinitialiser ce bâtiment
                </button>
            </div>
        </div>
    )
}
