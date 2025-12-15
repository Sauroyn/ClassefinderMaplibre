import { useEffect, useState } from 'react'
import { TriangleExclamation } from '@gravity-ui/icons'

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
            className="fixed left-1/2 -translate-x-1/2 bg-orange-500/95 dark:bg-orange-600/95 text-white px-4 py-2.5 rounded-lg shadow-xl max-w-[90%] w-auto text-sm z-[99999] flex items-center gap-2 animate-[slideUp_0.3s_ease-out]"
            style={{ bottom: isMobile ? 80 : 120 }}
        >
            <TriangleExclamation className="w-4 h-4" />
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
