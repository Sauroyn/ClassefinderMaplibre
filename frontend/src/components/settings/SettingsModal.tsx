import { useState, useEffect } from 'react'
import SettingsLayout from './SettingsLayout'
import { STORAGE_KEYS, safeGetItem, safeSetItem, safeRemoveItem } from '../../utils/storage'
import type { BuildingFiltersState, BuildingFilterSettings, BuildingMeta } from '../../hooks/useConfigData'

export default function SettingsModal({
    theme,
    onChangeTheme,
    icalUrl,
    onChangeIcalUrl,
    bufferMin,
    onChangeBufferMin,
    eventsEnabled,
    onChangeEventsEnabled,
    excludeStairs,
    onChangeExcludeStairs,
    coveredOnly,
    onChangeCoveredOnly,
    showSecondary,
    onChangeShowSecondary,
    onClose,
    data,
    editingAliasFeatureId,
    editingAliasOriginalName,
    initialTab,
    buildingsMeta,
    buildingFilters,
    onChangeBuildingFilter,
    onResetBuildingFilter,
    onResetAllBuildingFilters,
}: {
    theme: 'light' | 'dark'
    onChangeTheme: (t: 'light' | 'dark') => void
    icalUrl: string
    onChangeIcalUrl: (v: string) => void
    bufferMin: number
    onChangeBufferMin: (n: number) => void
    eventsEnabled: boolean
    onChangeEventsEnabled: (v: boolean) => void
    excludeStairs: boolean
    onChangeExcludeStairs: (v: boolean) => void
    coveredOnly: boolean
    onChangeCoveredOnly: (v: boolean) => void
    showSecondary: boolean
    onChangeShowSecondary: (v: boolean) => void
    onClose: () => void
    data?: GeoJSON.FeatureCollection | null
    editingAliasFeatureId?: string | number | null
    editingAliasOriginalName?: string
    initialTab?: 'general' | 'route' | 'alias' | 'calendar' | 'buildings'
    buildingsMeta: BuildingMeta[]
    buildingFilters: BuildingFiltersState
    onChangeBuildingFilter: (buildingId: string, next: BuildingFilterSettings) => void
    onResetBuildingFilter: (buildingId: string) => void
    onResetAllBuildingFilters: () => void
}) {
    // Local draft state for config (only applied on save)
    const [draftConfig, setDraftConfig] = useState<string | null>(null)

    // Initialize draft config from storage
    useEffect(() => {
        const currentConfig = safeGetItem(STORAGE_KEYS.CONFIG_FILE)
        setDraftConfig(currentConfig)
    }, [])

    // Handle save with config change
    const handleClose = () => {
        // Check if config changed
        const currentConfig = safeGetItem(STORAGE_KEYS.CONFIG_FILE)
        const configChanged = draftConfig !== currentConfig

        // Save config to storage
        if (draftConfig) {
            safeSetItem(STORAGE_KEYS.CONFIG_FILE, draftConfig)
        } else {
            safeRemoveItem(STORAGE_KEYS.CONFIG_FILE)
        }

        // Notify parent so it can persist other settings
        onClose()

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
            excludeStairs={excludeStairs}
            onChangeExcludeStairs={onChangeExcludeStairs}
            coveredOnly={coveredOnly}
            onChangeCoveredOnly={onChangeCoveredOnly}
            showSecondary={showSecondary}
            onChangeShowSecondary={onChangeShowSecondary}
            onClose={handleClose}
            data={data || null}
            editingAliasFeatureId={editingAliasFeatureId}
            editingAliasOriginalName={editingAliasOriginalName}
            initialTab={initialTab}
            buildingsMeta={buildingsMeta}
            buildingFilters={buildingFilters}
            onChangeBuildingFilter={onChangeBuildingFilter}
            onResetBuildingFilter={onResetBuildingFilter}
            onResetAllBuildingFilters={onResetAllBuildingFilters}
        />
    )
}
