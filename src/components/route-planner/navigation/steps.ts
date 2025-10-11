import type React from 'react'
import type { RouteStep } from '../RouteStepsGenerator'
import { haversineDistance } from './geometry'

export function updateStepsState(
    steps: RouteStep[],
    currentStepIndexRef: React.MutableRefObject<number>,
    userCoords: [number, number] | null,
    routeCoords: [number, number][],
    progress: number,
    setCurrentStepIndex: (i: number) => void,
    setDistanceToNextStep: (d: number | null) => void,
    setRemainingDistance: (d: number | null) => void,
    setEtaMinutes: (eta: number | null) => void
) {
    if (!steps || steps.length === 0 || !userCoords) return

    for (let i = currentStepIndexRef.current; i < steps.length; i++) {
        const step = steps[i]
        if (step.coordinates && step.coordinates[0]) {
            const stepCoords = step.coordinates[0] as [number, number]
            const distance = haversineDistance(userCoords, stepCoords)
            if (distance <= 30) { setCurrentStepIndex(i); currentStepIndexRef.current = i; break }
        }
    }

    const nextStep = steps[currentStepIndexRef.current + 1]
    if (nextStep && nextStep.coordinates && nextStep.coordinates[0] && userCoords) {
        const nextStepCoords = nextStep.coordinates[0] as [number, number]
        const distance = haversineDistance(userCoords, nextStepCoords)
        setDistanceToNextStep(Math.round(distance))
    } else {
        setDistanceToNextStep(null)
    }

    let totalRouteDistance = 0
    if (routeCoords.length > 1) {
        for (let i = 0; i < routeCoords.length - 1; i++) {
            totalRouteDistance += haversineDistance(routeCoords[i], routeCoords[i + 1])
        }
    }
    const remainingDist = Math.max(0, (1 - progress) * totalRouteDistance)
    setRemainingDistance(remainingDist)
    const walkingSpeed = 1.2 // m/s
    const eta = Math.round(remainingDist / walkingSpeed / 60)
    setEtaMinutes(eta)

    try {
        window.dispatchEvent(new CustomEvent('nav:state', {
            detail: {
                currentStepIndex: currentStepIndexRef.current,
                etaMinutes: eta,
                remainingDistance: remainingDist,
                // Distance to next step is not easily accessible here; consumer keeps state
            }
        }))
    } catch { }
}
