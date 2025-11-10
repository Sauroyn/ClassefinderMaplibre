import { useEffect, useState } from 'react'

type ToastProps = {
    message: string
    duration?: number
    onClose?: () => void
}

export default function Toast({ message, duration = 5000, onClose }: ToastProps) {
    const [visible, setVisible] = useState(true)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        // Detect mobile viewport
        const checkMobile = () => setIsMobile(window.innerWidth <= 720)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false)
            if (onClose) onClose()
        }, duration)

        return () => clearTimeout(timer)
    }, [duration, onClose])

    if (!visible) return null

    return (
        <div
            style={{
                position: 'fixed',
                bottom: isMobile ? 80 : 120,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(255, 152, 0, 0.95)',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                maxWidth: '90%',
                width: 'auto',
                fontSize: 13,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                animation: 'slideUp 0.3s ease-out'
            }}
        >
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span>{message}</span>
            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
            `}</style>
        </div>
    )
}
