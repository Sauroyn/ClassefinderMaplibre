import { useState, useMemo } from 'react'
import { Pencil, TrashBin } from '@gravity-ui/icons'
import { getAllAliases, setAlias, deleteAlias, getAvailableNamesForAliasSelector } from '../../utils/aliases'
import type { FeatureAlias } from '../../utils/aliases'
import SearchableSelect from './SearchableSelect'

type Props = {
    data: GeoJSON.FeatureCollection | null
    editingFeatureId?: string | number | null
    editingOriginalName?: string
}

export default function AliasManager({ data, editingFeatureId, editingOriginalName }: Props) {
    const [aliases, setAliases] = useState<FeatureAlias[]>(() => getAllAliases())
    const [selectedFeatureId, setSelectedFeatureId] = useState<string | number>(editingFeatureId || '')
    const [aliasName, setAliasName] = useState('')
    const [showOriginal, setShowOriginal] = useState(true)
    const [editingAlias, setEditingAlias] = useState<FeatureAlias | null>(null)

    // Refresh aliases list on mount or when aliases are updated
    const refreshAliases = () => {
        setAliases(getAllAliases())
    }

    // Get available features for selector (exclude features with aliases, unless editing)
    const availableFeatures = useMemo(() => {
        return getAvailableNamesForAliasSelector(data).filter(f =>
            !editingAlias || f.id !== editingAlias.featureId
        )
    }, [data, editingAlias])

    // Pre-fill form when editing a specific feature from outside
    useMemo(() => {
        if (editingFeatureId != null && editingOriginalName !== undefined) {
            setSelectedFeatureId(editingFeatureId)
            // Check if this feature already has an alias
            const existing = aliases.find(a => String(a.featureId) === String(editingFeatureId))
            if (existing) {
                setAliasName(existing.aliasName)
                setShowOriginal(existing.showOriginalInSearch)
                setEditingAlias(existing)
            } else {
                setAliasName('')
                setShowOriginal(true)
                setEditingAlias(null)
            }
        }
    }, [editingFeatureId, editingOriginalName, aliases])

    const handleSave = () => {
        if (!selectedFeatureId || !aliasName.trim()) {
            alert('Veuillez sélectionner une zone et entrer un alias')
            return
        }

        // Find the original name
        const feature = availableFeatures.find(f => String(f.id) === String(selectedFeatureId))
        const originalName = editingAlias?.originalName || feature?.name || ''

        const success = setAlias(selectedFeatureId, originalName, aliasName, showOriginal)
        if (success) {
            refreshAliases()
            // Reset form
            setSelectedFeatureId('')
            setAliasName('')
            setShowOriginal(true)
            setEditingAlias(null)
        } else {
            alert('Erreur lors de la sauvegarde de l\'alias')
        }
    }

    const handleEdit = (alias: FeatureAlias) => {
        setEditingAlias(alias)
        setSelectedFeatureId(alias.featureId)
        setAliasName(alias.aliasName)
        setShowOriginal(alias.showOriginalInSearch)
    }

    const handleDelete = (featureId: string | number) => {
        if (!confirm('Supprimer cet alias ?')) return
        const success = deleteAlias(featureId)
        if (success) {
            refreshAliases()
            // Reset form if we were editing this alias
            if (editingAlias && String(editingAlias.featureId) === String(featureId)) {
                setSelectedFeatureId('')
                setAliasName('')
                setShowOriginal(true)
                setEditingAlias(null)
            }
        }
    }

    const handleCancel = () => {
        setSelectedFeatureId('')
        setAliasName('')
        setShowOriginal(true)
        setEditingAlias(null)
    }

    return (
        <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
            <div className="text-[13px] font-semibold mb-3 text-gray-900 dark:text-gray-100">Gestion des alias</div>

            {/* Form to create/edit alias */}
            <div className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg mb-3">
                <div className="mb-2">
                    <label className="block text-xs mb-1 text-gray-900 dark:text-gray-100">
                        Zone à renommer {editingAlias && '(modification)'}
                    </label>
                    {editingAlias ? (
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">
                            {editingAlias.originalName || `Zone ${editingAlias.featureId}`}
                        </div>
                    ) : (
                        <SearchableSelect
                            options={availableFeatures}
                            value={selectedFeatureId}
                            onChange={setSelectedFeatureId}
                            placeholder="-- Sélectionner une zone --"
                        />
                    )}
                </div>

                <div className="mb-2">
                    <label className="block text-xs mb-1 text-gray-900 dark:text-gray-100">
                        Nouveau nom (alias)
                    </label>
                    <input
                        type="text"
                        value={aliasName}
                        onChange={(e) => setAliasName(e.target.value)}
                        placeholder="Ex: Salle TP1"
                        className="w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                </div>

                <div className="mb-3">
                    <label className="flex items-center gap-2 text-xs text-gray-900 dark:text-gray-100 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showOriginal}
                            onChange={(e) => setShowOriginal(e.target.checked)}
                            className="accent-blue-600 dark:accent-blue-500"
                        />
                        Afficher aussi le nom original dans la recherche
                    </label>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleSave}
                        className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        {editingAlias ? 'Modifier' : 'Ajouter'}
                    </button>
                    {editingAlias && (
                        <button
                            onClick={handleCancel}
                            className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            Annuler
                        </button>
                    )}
                </div>
            </div>

            {/* List of existing aliases */}
            {aliases.length > 0 && (
                <div>
                    <div className="text-xs mb-1.5 text-gray-600 dark:text-gray-400">
                        Alias existants ({aliases.length})
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {aliases.map(alias => (
                            <div
                                key={alias.featureId}
                                className="p-2.5 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 flex justify-between items-center"
                            >
                                <div className="flex-1">
                                    <div className="font-semibold text-[13px] text-gray-900 dark:text-gray-100">{alias.aliasName}</div>
                                    {alias.originalName && (
                                        <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                                            Original: {alias.originalName}
                                        </div>
                                    )}
                                    {!alias.showOriginalInSearch && (
                                        <div className="text-[11px] text-gray-500 dark:text-gray-500 mt-0.5">
                                            (nom original masqué)
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEdit(alias)}
                                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 cursor-pointer text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                        title="Modifier"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(alias.featureId)}
                                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-transparent text-red-600 dark:text-red-500 cursor-pointer text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Supprimer"
                                    >
                                        <TrashBin className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {aliases.length === 0 && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-500 text-xs">
                    Aucun alias défini pour le moment
                </div>
            )}
        </div>
    )
}
