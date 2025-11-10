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
        <div style={{ background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)', border: '1px solid var(--panel-border, #ddd)', borderRadius: 6, padding: 8, minWidth: 220, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Config</div>
            {files.length === 0 ? (
                <div style={{ fontSize: 12 }}>Aucun fichier .json trouvé</div>
            ) : (
                <select
                    style={{ width: '100%', background: 'var(--panel-bg, white)', color: 'var(--panel-fg, #111)', border: '1px solid var(--panel-border, #ddd)', borderRadius: 6, padding: 6 }}
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
        <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9999 }}>{content}</div>
    )
};

export default ConfigSelector;
