import React, { useEffect, useState } from 'react';
import publicConfigs from 'virtual:public-configs'

const STORAGE_KEY = 'site_config_file'

const ConfigSelector: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const [selected, setSelected] = useState<string | null>(typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) || null) : null);
    const [files, setFiles] = useState<string[]>([])

    useEffect(() => {
        // list is provided at build/dev time by virtual module
        setFiles((publicConfigs || []).slice().sort())
    }, [])

    const content = (
        <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: 6, padding: 8, minWidth: 220, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Config</div>
            {files.length === 0 ? (
                <div style={{ fontSize: 12 }}>Aucun fichier .json trouvé</div>
            ) : (
                <select
                    style={{ width: '100%' }}
                    value={selected || ''}
                    onChange={(e) => {
                        const v = e.target.value || null
                        setSelected(v)
                        try {
                            if (v) localStorage.setItem(STORAGE_KEY, v)
                            else localStorage.removeItem(STORAGE_KEY)
                        } catch (e) { }
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
        <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9999 }}>{content}</div>
    )
};

export default ConfigSelector;
