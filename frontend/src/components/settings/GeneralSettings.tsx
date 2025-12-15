import { useEffect, useState } from 'react'
import { Sun, Moon } from '@gravity-ui/icons'
import SearchableSelect from './SearchableSelect'
import publicConfigs from 'virtual:public-configs'
import { configNameToSlug } from '../../utils/api'
import type { ThemeMode } from '../../theme/colors'

type Props = {
    theme: ThemeMode
    onChangeTheme: (t: ThemeMode) => void
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
            <h2 className="mt-0 mb-6 text-[22px] font-bold">
                Paramètres généraux
            </h2>

            {/* Theme selection */}
            <div className="mb-8">
                <label
                    htmlFor="theme-select"
                    className="block mb-2 font-semibold text-sm text-gray-900 dark:text-gray-100"
                >
                    Mode d'affichage
                </label>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
                    {/* Light mode */}
                    <button
                        onClick={() => onChangeTheme('light')}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme === 'light'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                            } hover:border-blue-400 dark:hover:border-blue-600`}
                    >
                        <Sun className="w-8 h-8" />
                        <span className={`text-sm ${theme === 'light' ? 'font-semibold' : 'font-normal'}`}>Clair</span>
                    </button>

                    {/* Dark mode */}
                    <button
                        onClick={() => onChangeTheme('dark')}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme === 'dark'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                            } hover:border-blue-400 dark:hover:border-blue-600`}
                    >
                        <Moon className="w-8 h-8" />
                        <span className={`text-sm ${theme === 'dark' ? 'font-semibold' : 'font-normal'}`}>Sombre</span>
                    </button>

                    {/* Automatic mode */}
                    <button
                        onClick={() => onChangeTheme('auto')}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${theme === 'auto'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                            } hover:border-blue-400 dark:hover:border-blue-600`}
                    >
                        <span className="text-3xl">🌗</span>
                        <span className={`text-sm ${theme === 'auto' ? 'font-semibold' : 'font-normal'}`}>Automatique</span>
                    </button>
                </div>
            </div>

            {/* Configuration selection */}
            <div className="mb-8">
                <label className="block mb-2 font-semibold text-sm text-gray-900 dark:text-gray-100">
                    Configuration de carte
                </label>
                {configFiles.length === 0 ? (
                    <div className="p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-sm opacity-70">
                        Aucun fichier de configuration trouvé
                    </div>
                ) : (
                    <>
                        <SearchableSelect
                            options={configFiles.map((file) => ({
                                id: configNameToSlug(file),
                                name: file,
                                level: ''
                            }))}
                            value={selectedConfig ? configNameToSlug(selectedConfig) : ''}
                            onChange={(value) => {
                                const stringValue = String(value)
                                onChangeConfig(stringValue || null)
                            }}
                            placeholder="— Sélectionner une configuration —"
                        />
                        <div className="mt-2 text-xs opacity-70">
                            Cliquez sur "Enregistrer" pour appliquer les changements
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
