import { useState, useEffect } from 'react'
import GeneralSettings from './GeneralSettings'
import AliasSettings from './AliasSettings'
import CalendarSettings from './CalendarSettings'

type Tab = 'general' | 'alias' | 'calendar'

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

    // Alias settings
    data?: GeoJSON.FeatureCollection | null
    editingAliasFeatureId?: string | number | null
    editingAliasOriginalName?: string

    // Actions
    onCancel: () => void
    onSave: () => void
}

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
    { id: 'general', label: 'Général', icon: '⚙️' },
    { id: 'alias', label: 'Alias', icon: '🏷️' },
    { id: 'calendar', label: 'Calendrier', icon: '📅' }
]

export default function SettingsLayout(props: Props) {
    const [activeTab, setActiveTab] = useState<Tab>('general')
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
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 10001,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--panel-bg, white)',
                    color: 'var(--panel-fg, #111)'
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderBottom: '1px solid var(--panel-border, #ddd)',
                        position: 'sticky',
                        top: 0,
                        background: 'var(--panel-bg, white)',
                        zIndex: 10
                    }}
                >
                    {mobileDetailOpen && (
                        <button
                            onClick={() => setMobileDetailOpen(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                fontSize: 20,
                                color: 'var(--panel-fg, #111)',
                                cursor: 'pointer',
                                padding: 4
                            }}
                            aria-label="Retour"
                        >
                            ←
                        </button>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 18, flex: 1 }}>
                        {mobileDetailOpen ? tabs.find(t => t.id === activeTab)?.label : 'Paramètres'}
                    </div>
                    <button
                        onClick={props.onCancel}
                        aria-label="Fermer"
                        title="Fermer"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: 24,
                            color: 'var(--panel-fg, #111)',
                            cursor: 'pointer',
                            padding: 4
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {!mobileDetailOpen ? (
                        // Tabs list
                        <div style={{ padding: 16 }}>
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id)
                                        setMobileDetailOpen(true)
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: 16,
                                        marginBottom: 12,
                                        borderRadius: 12,
                                        border: '1px solid var(--panel-border, #ddd)',
                                        background: 'var(--panel-bg, white)',
                                        color: 'var(--panel-fg, #111)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        cursor: 'pointer',
                                        fontSize: 16,
                                        textAlign: 'left',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <span style={{ fontSize: 24 }}>{tab.icon}</span>
                                    <span style={{ flex: 1, fontWeight: 500 }}>{tab.label}</span>
                                    <span style={{ fontSize: 18, opacity: 0.5 }}>›</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        // Tab content
                        <div style={{ padding: 16 }}>{renderTabContent()}</div>
                    )}
                </div>

                {/* Footer actions - only show when not in detail view */}
                {!mobileDetailOpen && (
                    <div
                        style={{
                            display: 'flex',
                            gap: 12,
                            padding: 16,
                            borderTop: '1px solid var(--panel-border, #ddd)',
                            background: 'var(--panel-bg, white)'
                        }}
                    >
                        <button
                            onClick={props.onCancel}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: '1px solid var(--panel-border, #ddd)',
                                background: 'transparent',
                                color: 'var(--panel-fg, #111)',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Annuler
                        </button>
                        <button
                            onClick={props.onSave}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: 8,
                                border: '1px solid var(--btn-border, #ddd)',
                                background: 'var(--btn-bg, #007AFF)',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
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
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10001,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)'
            }}
            onClick={props.onCancel}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'relative',
                    background: 'var(--panel-bg, white)',
                    color: 'var(--panel-fg, #111)',
                    borderRadius: 16,
                    width: 'min(90vw, 900px)',
                    height: 'min(85vh, 650px)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    display: 'flex',
                    overflow: 'hidden'
                }}
            >
                {/* Sidebar */}
                <div
                    style={{
                        width: 240,
                        borderRight: '1px solid var(--panel-border, #ddd)',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'var(--muted, #f8f9fa)'
                    }}
                >
                    <div style={{ padding: 20, borderBottom: '1px solid var(--panel-border, #ddd)' }}>
                        <div style={{ fontWeight: 700, fontSize: 20 }}>Paramètres</div>
                    </div>
                    <div style={{ flex: 1, padding: 12, overflowY: 'auto' }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    width: '100%',
                                    padding: 12,
                                    marginBottom: 4,
                                    borderRadius: 8,
                                    border: 'none',
                                    background: activeTab === tab.id ? 'var(--panel-bg, white)' : 'transparent',
                                    color: 'var(--panel-fg, #111)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    cursor: 'pointer',
                                    fontSize: 14,
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    fontWeight: activeTab === tab.id ? 600 : 400,
                                    boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                                }}
                            >
                                <span style={{ fontSize: 18 }}>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Close button */}
                    <button
                        onClick={props.onCancel}
                        aria-label="Fermer"
                        title="Fermer"
                        style={{
                            position: 'absolute',
                            right: 16,
                            top: 16,
                            background: 'var(--muted, #f1f3f5)',
                            border: 'none',
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            fontSize: 18,
                            color: 'var(--panel-fg, #111)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s'
                        }}
                    >
                        ✕
                    </button>

                    {/* Tab content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>{renderTabContent()}</div>

                    {/* Footer actions */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 12,
                            padding: 20,
                            borderTop: '1px solid var(--panel-border, #ddd)',
                            background: 'var(--panel-bg, white)'
                        }}
                    >
                        <button
                            onClick={props.onCancel}
                            style={{
                                padding: '10px 20px',
                                borderRadius: 8,
                                border: '1px solid var(--panel-border, #ddd)',
                                background: 'transparent',
                                color: 'var(--panel-fg, #111)',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Annuler
                        </button>
                        <button
                            onClick={props.onSave}
                            style={{
                                padding: '10px 24px',
                                borderRadius: 8,
                                border: 'none',
                                background: '#007AFF',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Enregistrer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
