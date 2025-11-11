import { useEffect, useState } from 'react'
import SearchableSelect from './SearchableSelect'
import publicConfigs from 'virtual:public-configs'

type Props = {
    theme: 'light' | 'dark'
    onChangeTheme: (t: 'light' | 'dark') => void
    selectedConfig: string | null
    onChangeConfig: (config: string | null) => void
}

export default function GeneralSettings({ theme, onChangeTheme, selectedConfig, onChangeConfig }: Props) {
    const [configFiles, setConfigFiles] = useState<string[]>([])

    useEffect(() => {
        // list is provided at build/dev time by virtual module
        setConfigFiles((publicConfigs || []).slice().sort())
    }, [])
    return (
        <div>
            <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: 22, fontWeight: 700 }}>
                Paramètres généraux
            </h2>

            {/* Theme selection */}
            <div style={{ marginBottom: 32 }}>
                <label
                    htmlFor="theme-select"
                    style={{
                        display: 'block',
                        marginBottom: 8,
                        fontWeight: 600,
                        fontSize: 14,
                        color: 'var(--panel-fg, #111)'
                    }}
                >
                    Mode d'affichage
                </label>
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: 12
                    }}
                >
                    {/* Light mode */}
                    <button
                        onClick={() => onChangeTheme('light')}
                        style={{
                            padding: 16,
                            borderRadius: 12,
                            border: `2px solid ${theme === 'light' ? '#007AFF' : 'var(--panel-border, #ddd)'}`,
                            background: theme === 'light' ? 'rgba(0, 122, 255, 0.1)' : 'var(--panel-bg, white)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        <span style={{ fontSize: 32 }}>☀️</span>
                        <span style={{ fontWeight: theme === 'light' ? 600 : 400, fontSize: 14 }}>Clair</span>
                    </button>

                    {/* Dark mode */}
                    <button
                        onClick={() => onChangeTheme('dark')}
                        style={{
                            padding: 16,
                            borderRadius: 12,
                            border: `2px solid ${theme === 'dark' ? '#007AFF' : 'var(--panel-border, #ddd)'}`,
                            background: theme === 'dark' ? 'rgba(0, 122, 255, 0.1)' : 'var(--panel-bg, white)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        <span style={{ fontSize: 32 }}>🌙</span>
                        <span style={{ fontWeight: theme === 'dark' ? 600 : 400, fontSize: 14 }}>Sombre</span>
                    </button>

                    {/* Automatic mode - future enhancement */}
                    <button
                        disabled
                        style={{
                            padding: 16,
                            borderRadius: 12,
                            border: '2px solid var(--panel-border, #ddd)',
                            background: 'var(--muted, #f8f9fa)',
                            cursor: 'not-allowed',
                            opacity: 0.5,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 8
                        }}
                    >
                        <span style={{ fontSize: 32 }}>🌗</span>
                        <span style={{ fontSize: 14 }}>Automatique</span>
                        <span style={{ fontSize: 10, opacity: 0.7 }}>(Bientôt)</span>
                    </button>
                </div>
            </div>

            {/* Configuration selection */}
            <div style={{ marginBottom: 32 }}>
                <label
                    style={{
                        display: 'block',
                        marginBottom: 8,
                        fontWeight: 600,
                        fontSize: 14,
                        color: 'var(--panel-fg, #111)'
                    }}
                >
                    Configuration de carte
                </label>
                {configFiles.length === 0 ? (
                    <div
                        style={{
                            padding: 16,
                            borderRadius: 12,
                            border: '1px solid var(--panel-border, #ddd)',
                            background: 'var(--muted, #f8f9fa)',
                            fontSize: 14,
                            opacity: 0.7
                        }}
                    >
                        Aucun fichier de configuration trouvé
                    </div>
                ) : (
                    <>
                        <SearchableSelect
                            options={configFiles.map((file) => ({
                                id: file,
                                name: file,
                                level: ''
                            }))}
                            value={selectedConfig || ''}
                            onChange={(value) => {
                                const stringValue = String(value)
                                onChangeConfig(stringValue || null)
                            }}
                            placeholder="— Sélectionner une configuration —"
                        />
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                            Cliquez sur "Enregistrer" pour appliquer les changements
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
