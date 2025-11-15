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
        <div ref={containerRef} className="relative w-full">
            {/* Selected value / trigger button */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-2 rounded-md border border-gray-300 dark:border-gray-600 text-left flex justify-between items-center ${disabled
                        ? 'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed opacity-60'
                        : 'bg-white dark:bg-gray-800 cursor-pointer'
                    } text-gray-900 dark:text-gray-100`}
            >
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                    {selectedOption ? (
                        <>
                            {selectedOption.name}
                            {selectedOption.level != null && (
                                <span className="ml-2 text-xs opacity-70">
                                    (Niveau {selectedOption.level})
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="opacity-50">{placeholder}</span>
                    )}
                </span>
                <span className="ml-2 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-[1000] max-h-[300px] flex flex-col">
                    {/* Search input */}
                    <div className="p-2 border-b border-gray-300 dark:border-gray-600">
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Rechercher..."
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-[13px] outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                    </div>

                    {/* Options list */}
                    <div className="overflow-y-auto max-h-60">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-500 text-[13px]">
                                Aucun résultat
                            </div>
                        ) : (
                            filteredOptions.map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    className={`w-full px-3 py-2 border-none text-left cursor-pointer text-[13px] flex justify-between items-center transition-colors ${String(option.id) === String(value)
                                            ? 'bg-gray-100 dark:bg-gray-700'
                                            : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        } text-gray-900 dark:text-gray-100`}
                                >
                                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                                        {option.name}
                                    </span>
                                    {option.level != null && (
                                        <span className="ml-2 text-[11px] opacity-60 flex-shrink-0">
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
