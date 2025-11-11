import { useState, useEffect } from 'react'
import { Xmark, ArrowLeft } from '@gravity-ui/icons'
import GeneralSettings from './GeneralSettings'
import AliasSettings from './AliasSettings'
import CalendarSettings from './CalendarSettings'
import RouteSettings from './RouteSettings'

type Tab = 'general' | 'alias' | 'calendar' | 'route'

type Props = {
    // General settings
    theme: 'light' | 'dark'
    onChangeTheme: (t: 'light' | 'dark') => void
    selectedConfig: string | null
    onChangeConfig: (config: string | null) => void

    // Calendar settings
    icalUrl: string
    onChangeIcalUrl: (v: string) => void
    bufferMin: number
    onChangeBufferMin: (n: number) => void
    eventsEnabled: boolean
    onChangeEventsEnabled: (v: boolean) => void

    // Route settings
    excludeStairs: boolean
    onChangeExcludeStairs: (v: boolean) => void
    coveredOnly: boolean
    onChangeCoveredOnly: (v: boolean) => void
    showSecondary: boolean
    onChangeShowSecondary: (v: boolean) => void

    // Alias settings
    data?: GeoJSON.FeatureCollection | null
    editingAliasFeatureId?: string | number | null
    editingAliasOriginalName?: string

    // Actions
    onCancel: () => void
    onSave: () => void

    // Optional: initial tab to open
    initialTab?: Tab
}

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'general', label: 'Général', icon: '⚙️' },
    { id: 'route', label: 'Itinéraire', icon: '🗺️' },
    { id: 'alias', label: 'Alias', icon: '🏷️' },
    { id: 'calendar', label: 'Calendrier', icon: '📅' }
]

export default function SettingsLayout(props: Props) {
    const [activeTab, setActiveTab] = useState<Tab>(props.initialTab || 'general')
    const [isMobile, setIsMobile] = useState(false)
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Update active tab when initialTab prop changes
    useEffect(() => {
        if (props.initialTab) {
            setActiveTab(props.initialTab)
            if (isMobile && props.initialTab !== 'general') {
                setMobileDetailOpen(true)
            }
        }
    }, [props.initialTab, isMobile])

    // Auto-open alias tab if editing
    useEffect(() => {
        if (props.editingAliasFeatureId != null) {
            setActiveTab('alias')
            if (isMobile) {
                setMobileDetailOpen(true)
            }
        }
    }, [props.editingAliasFeatureId, isMobile])

    const renderTabContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <GeneralSettings
                        theme={props.theme}
                        onChangeTheme={props.onChangeTheme}
                        selectedConfig={props.selectedConfig}
                        onChangeConfig={props.onChangeConfig}
                    />
                )
            case 'route':
                return (
                    <RouteSettings
                        excludeStairs={props.excludeStairs}
                        onChangeExcludeStairs={props.onChangeExcludeStairs}
                        coveredOnly={props.coveredOnly}
                        onChangeCoveredOnly={props.onChangeCoveredOnly}
                        showSecondary={props.showSecondary}
                        onChangeShowSecondary={props.onChangeShowSecondary}
                    />
                )
            case 'alias':
                return (
                    <AliasSettings
                        data={props.data || null}
                        editingFeatureId={props.editingAliasFeatureId}
                        editingOriginalName={props.editingAliasOriginalName}
                    />
                )
            case 'calendar':
                return (
                    <CalendarSettings
                        icalUrl={props.icalUrl}
                        onChangeIcalUrl={props.onChangeIcalUrl}
                        bufferMin={props.bufferMin}
                        onChangeBufferMin={props.onChangeBufferMin}
                        eventsEnabled={props.eventsEnabled}
                        onChangeEventsEnabled={props.onChangeEventsEnabled}
                    />
                )
        }
    }

    // Mobile view: full screen with tabs list or detail
    if (isMobile) {
        return (
            <div
                role="dialog"
                aria-modal="true"
                className="fixed inset-0 z-[10001] flex flex-col bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    {mobileDetailOpen && (
                        <button
                            onClick={() => setMobileDetailOpen(false)}
                            className="bg-transparent border-none text-xl text-gray-900 dark:text-gray-100 cursor-pointer p-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                            aria-label="Retour"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="font-bold text-lg flex-1">
                        {mobileDetailOpen ? tabs.find(t => t.id === activeTab)?.label : 'Paramètres'}
                    </div>
                    <button
                        onClick={props.onCancel}
                        aria-label="Fermer"
                        title="Fermer"
                        className="bg-transparent border-none text-2xl text-gray-900 dark:text-gray-100 cursor-pointer p-1 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                    >
                        <Xmark className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {!mobileDetailOpen ? (
                        // Tabs list
                        <div className="p-4">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id)
                                        setMobileDetailOpen(true)
                                    }}
                                    className="w-full p-4 mb-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex items-center gap-3 cursor-pointer text-base text-left transition-all hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    <span className="text-2xl">{tab.icon}</span>
                                    <span className="flex-1 font-medium">{tab.label}</span>
                                    <span className="text-lg opacity-50">›</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        // Tab content
                        <div className="p-4">{renderTabContent()}</div>
                    )}
                </div>

                {/* Footer actions - only show when not in detail view */}
                {!mobileDetailOpen && (
                    <div className="flex gap-3 p-4 border-t border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                        <button
                            onClick={props.onCancel}
                            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 cursor-pointer font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={props.onSave}
                            className="flex-1 px-4 py-3 rounded-lg border-none bg-blue-600 hover:bg-blue-700 text-white cursor-pointer font-medium transition-colors"
                        >
                            Enregistrer
                        </button>
                    </div>
                )}
            </div>
        )
    }

    // Desktop view: modal with sidebar
    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={props.onCancel}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl w-[min(90vw,900px)] h-[min(85vh,650px)] shadow-2xl flex overflow-hidden"
            >
                {/* Sidebar */}
                <div className="w-60 border-r border-gray-300 dark:border-gray-600 flex flex-col bg-gray-100 dark:bg-gray-700/50">
                    <div className="p-5 border-b border-gray-300 dark:border-gray-600">
                        <div className="font-bold text-xl">Paramètres</div>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full p-3 mb-1 rounded-lg border-none flex items-center gap-2.5 cursor-pointer text-sm text-left transition-all ${activeTab === tab.id
                                    ? 'bg-white dark:bg-gray-800 font-semibold shadow-md'
                                    : 'bg-transparent font-normal hover:bg-white/50 dark:hover:bg-gray-800/50'
                                    }`}
                            >
                                <span className="text-lg">{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content area */}
                <div className="flex-1 flex flex-col">
                    {/* Close button */}
                    <button
                        onClick={props.onCancel}
                        aria-label="Fermer"
                        title="Fermer"
                        className="absolute right-4 top-4 bg-gray-100 dark:bg-gray-700 border-none w-8 h-8 rounded-lg text-lg text-gray-900 dark:text-gray-100 cursor-pointer flex items-center justify-center transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                        <Xmark className="w-5 h-5" />
                    </button>

                    {/* Tab content */}
                    <div className="flex-1 overflow-y-auto p-8">{renderTabContent()}</div>

                    {/* Footer actions */}
                    <div className="flex justify-end gap-3 p-5 border-t border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                        <button
                            onClick={props.onCancel}
                            className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-gray-900 dark:text-gray-100 cursor-pointer font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={props.onSave}
                            className="px-6 py-2.5 rounded-lg border-none bg-blue-600 hover:bg-blue-700 text-white cursor-pointer font-medium transition-colors"
                        >
                            Enregistrer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
