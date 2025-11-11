import { useState, useEffect } from 'react'
import SettingsLayout from './SettingsLayout'
import { STORAGE_KEYS, safeGetItem, safeSetItem, safeRemoveItem } from '../../utils/storage'

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
    // Local draft state for config (only applied on save)
    const [draftConfig, setDraftConfig] = useState<string | null>(null)

    // Initialize draft config from storage
    useEffect(() => {
        const currentConfig = safeGetItem(STORAGE_KEYS.CONFIG_FILE)
        setDraftConfig(currentConfig)
    }, [])

    // Handle save with config change
    const handleSave = () => {
        // Check if config changed
        const currentConfig = safeGetItem(STORAGE_KEYS.CONFIG_FILE)
        const configChanged = draftConfig !== currentConfig

        // Save config to storage
        if (draftConfig) {
            safeSetItem(STORAGE_KEYS.CONFIG_FILE, draftConfig)
        } else {
            safeRemoveItem(STORAGE_KEYS.CONFIG_FILE)
        }

        // Call original onSave
        onSave()

        // Reload page if config changed
        if (configChanged) {
            window.location.reload()
        }
    }

    return (
        <SettingsLayout
            theme={theme}
            onChangeTheme={onChangeTheme}
            selectedConfig={draftConfig}
            onChangeConfig={setDraftConfig}
            icalUrl={icalUrl}
            onChangeIcalUrl={onChangeIcalUrl}
            bufferMin={bufferMin}
            onChangeBufferMin={onChangeBufferMin}
            eventsEnabled={eventsEnabled}
            onChangeEventsEnabled={onChangeEventsEnabled}
            onCancel={onCancel}
            onSave={handleSave}
            data={data || null}
            editingAliasFeatureId={editingAliasFeatureId}
            editingAliasOriginalName={editingAliasOriginalName}
        />
    )
}
