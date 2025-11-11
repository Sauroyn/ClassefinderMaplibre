import React, { useEffect, useState } from 'react';
import publicConfigs from 'virtual:public-configs'
import { STORAGE_KEYS, safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage'

const ConfigSelector: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const [selected, setSelected] = useState<string | null>(
        typeof window !== 'undefined' ? safeGetItem(STORAGE_KEYS.CONFIG_FILE) : null
    );
    const [files, setFiles] = useState<string[]>([])

    useEffect(() => {
        // list is provided at build/dev time by virtual module
        setFiles((publicConfigs || []).slice().sort())
    }, [])

    const content = (
        <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md p-2 min-w-[220px] shadow-lg">
            <div className="font-semibold mb-1.5">Config</div>
            {files.length === 0 ? (
                <div className="text-xs">Aucun fichier .json trouvé</div>
            ) : (
                <select
                    className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md p-1.5"
                    value={selected || ''}
                    onChange={(e) => {
                        const v = e.target.value || null
                        setSelected(v)
                        if (v) {
                            safeSetItem(STORAGE_KEYS.CONFIG_FILE, v)
                        } else {
                            safeRemoveItem(STORAGE_KEYS.CONFIG_FILE)
                        }
                        window.location.reload()
                    }}
                >
                    <option value="">— choisir —</option>
                    {files.map((f) => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>
            )}
        </div>
    )

    if (embedded) return content
    return (
        <div className="fixed right-3 bottom-3 z-[9999]">{content}</div>
    )
};

export default ConfigSelector;
