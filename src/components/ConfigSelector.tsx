import React, { useMemo, useState } from 'react';

// Use Vite's import.meta.glob to collect JSON files at build time from src/configs
const modules = import.meta.glob('/src/configs/*.json', { as: 'raw' }) as Record<string, () => Promise<string>>;

const STORAGE_KEY = 'site_config_file'

const ConfigSelector: React.FC = () => {
    const [selected, setSelected] = useState<string | null>(typeof window !== 'undefined' ? (localStorage.getItem(STORAGE_KEY) || null) : null);

    const files = useMemo(() => {
        // keys are absolute-ish paths like '/src/configs/test.json'
        return Object.keys(modules).map((k) => {
            const parts = k.split('/');
            return parts[parts.length - 1];
        }).sort();
    }, []);

    return (
        <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 9999 }}>
            <div style={{ background: 'white', border: '1px solid #ddd', borderRadius: 6, padding: 8, minWidth: 180, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
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
                            // reload the page so the new config is applied on startup
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
        </div>
    );
};

export default ConfigSelector;
