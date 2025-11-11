import { useState, useMemo } from 'react'
import { getAllAliases, setAlias, deleteAlias, getAvailableNamesForAliasSelector } from '../../utils/aliases'
import type { FeatureAlias } from '../../utils/aliases'

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
        <div style={{ borderTop: '1px solid var(--panel-border, #ddd)', paddingTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Gestion des alias</div>

            {/* Form to create/edit alias */}
            <div style={{ background: 'var(--muted, #f8f9fa)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ marginBottom: 8 }}>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                        Zone à renommer {editingAlias && '(modification)'}
                    </label>
                    {editingAlias ? (
                        <div style={{ padding: 8, background: 'var(--panel-bg, white)', borderRadius: 6, border: '1px solid var(--panel-border, #ddd)' }}>
                            {editingAlias.originalName || `Zone ${editingAlias.featureId}`}
                        </div>
                    ) : (
                        <select
                            value={selectedFeatureId}
                            onChange={(e) => setSelectedFeatureId(e.target.value)}
                            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--panel-border, #ddd)', background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)' }}
                        >
                            <option value="">-- Sélectionner une zone --</option>
                            {availableFeatures.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.name} {f.level != null ? `(Niveau ${f.level})` : ''}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div style={{ marginBottom: 8 }}>
                    <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                        Nouveau nom (alias)
                    </label>
                    <input
                        type="text"
                        value={aliasName}
                        onChange={(e) => setAliasName(e.target.value)}
                        placeholder="Ex: Salle TP1"
                        style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--panel-border, #ddd)', background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)' }}
                    />
                </div>

                <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <input
                            type="checkbox"
                            checked={showOriginal}
                            onChange={(e) => setShowOriginal(e.target.checked)}
                            style={{ accentColor: 'var(--btn-border, #777)' }}
                        />
                        Afficher aussi le nom original dans la recherche
                    </label>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={handleSave}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--btn-border, #ddd)', background: 'var(--btn-bg, white)', color: 'var(--btn-fg, #111)', cursor: 'pointer', fontWeight: 500 }}
                    >
                        {editingAlias ? 'Modifier' : 'Ajouter'}
                    </button>
                    {editingAlias && (
                        <button
                            onClick={handleCancel}
                            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--panel-border, #ddd)', background: 'transparent', color: 'var(--panel-fg, #111)', cursor: 'pointer' }}
                        >
                            Annuler
                        </button>
                    )}
                </div>
            </div>

            {/* List of existing aliases */}
            {aliases.length > 0 && (
                <div>
                    <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--chip-fg, #666)' }}>
                        Alias existants ({aliases.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {aliases.map(alias => (
                            <div
                                key={alias.featureId}
                                style={{
                                    padding: 10,
                                    background: 'var(--panel-bg, white)',
                                    borderRadius: 6,
                                    border: '1px solid var(--panel-border, #ddd)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{alias.aliasName}</div>
                                    {alias.originalName && (
                                        <div style={{ fontSize: 11, color: 'var(--chip-fg, #666)', marginTop: 2 }}>
                                            Original: {alias.originalName}
                                        </div>
                                    )}
                                    {!alias.showOriginalInSearch && (
                                        <div style={{ fontSize: 11, color: 'var(--chip-fg, #999)', marginTop: 2 }}>
                                            (nom original masqué)
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button
                                        onClick={() => handleEdit(alias)}
                                        style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--btn-border, #ddd)', background: 'transparent', color: 'var(--btn-fg, #111)', cursor: 'pointer', fontSize: 12 }}
                                        title="Modifier"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDelete(alias.featureId)}
                                        style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--btn-border, #ddd)', background: 'transparent', color: '#d32f2f', cursor: 'pointer', fontSize: 12 }}
                                        title="Supprimer"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {aliases.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--chip-fg, #999)', fontSize: 12 }}>
                    Aucun alias défini pour le moment
                </div>
            )}
        </div>
    )
}
