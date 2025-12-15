/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Placeholder pour vos couleurs personnalisées
                // Vous pourrez les ajouter ici après inspection
                primary: {
                    DEFAULT: '#3b82f6',
                    dark: '#2563eb',
                },
                secondary: {
                    DEFAULT: '#64748b',
                    dark: '#475569',
                },
            },
            zIndex: {
                'map': '0',
                'controls': '10',
                'overlay': '20',
                'selector': '28',
                'search': '30',
                'modal': '50',
                'sheet': '2147483000',
            },
        },
    },
    plugins: [],
}
