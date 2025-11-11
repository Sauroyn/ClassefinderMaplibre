import { useState, useRef, useEffect } from 'react'

type Option = {
    id: string | number
    name: string
    level?: string | number
}

type Props = {
    options: Option[]
    value: string | number
    onChange: (value: string | number) => void
    placeholder?: string
    disabled?: boolean
}

export default function SearchableSelect({ options, value, onChange, placeholder = 'Rechercher...', disabled = false }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Find selected option
    const selectedOption = options.find(opt => String(opt.id) === String(value))

    // Filter options based on search query
    const filteredOptions = searchQuery.trim()
        ? options.filter(opt =>
            opt.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
        )
        : options

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setSearchQuery('')
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    // Focus input when opening
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isOpen])

    const handleSelect = (option: Option) => {
        onChange(option.id)
        setIsOpen(false)
        setSearchQuery('')
    }

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            {/* Selected value / trigger button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: 8,
                    borderRadius: 6,
                    border: '1px solid var(--panel-border, #ddd)',
                    background: disabled ? 'var(--muted, #f8f9fa)' : 'var(--panel-bg, white)',
                    color: 'var(--panel-fg, #111)',
                    textAlign: 'left',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: disabled ? 0.6 : 1
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedOption ? (
                        <>
                            {selectedOption.name}
                            {selectedOption.level != null && (
                                <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>
                                    (Niveau {selectedOption.level})
                                </span>
                            )}
                        </>
                    ) : (
                        <span style={{ opacity: 0.5 }}>{placeholder}</span>
                    )}
                </span>
                <span style={{ marginLeft: 8, fontSize: 12 }}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: 'var(--panel-bg, white)',
                        border: '1px solid var(--panel-border, #ddd)',
                        borderRadius: 6,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        maxHeight: 300,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Search input */}
                    <div style={{ padding: 8, borderBottom: '1px solid var(--panel-border, #ddd)' }}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher..."
                            style={{
                                width: '100%',
                                padding: '6px 8px',
                                border: '1px solid var(--panel-border, #ddd)',
                                borderRadius: 4,
                                background: 'var(--panel-bg, white)',
                                color: 'var(--panel-fg, #111)',
                                outline: 'none',
                                fontSize: 13
                            }}
                        />
                    </div>

                    {/* Options list */}
                    <div style={{ overflowY: 'auto', maxHeight: 240 }}>
                        {filteredOptions.length === 0 ? (
                            <div style={{ padding: 16, textAlign: 'center', color: 'var(--chip-fg, #999)', fontSize: 13 }}>
                                Aucun résultat
                            </div>
                        ) : (
                            filteredOptions.map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: 'none',
                                        background: String(option.id) === String(value) ? 'var(--muted, #f1f3f5)' : 'transparent',
                                        color: 'var(--panel-fg, #111)',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'background 0.1s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (String(option.id) !== String(value)) {
                                            e.currentTarget.style.background = 'var(--muted, #f8f9fa)'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (String(option.id) !== String(value)) {
                                            e.currentTarget.style.background = 'transparent'
                                        }
                                    }}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {option.name}
                                    </span>
                                    {option.level != null && (
                                        <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6, flexShrink: 0 }}>
                                            Niveau {option.level}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
