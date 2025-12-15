import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to enforce location lock on geojson endpoints.
 * 
 * If a config requires locationLock, checks that:
 * 1. Client has provided user location via x-user-position header (format: "lng,lat")
 * 2. User position is within the configured perimeter
 */
export async function locationLockMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        // Get the config name/path from the request (comes from query or body)
        const configName = req.query.config as string | undefined || req.body?.config as string | undefined;
        
        if (!configName) {
            // No specific config required, proceed
            return next();
        }

        // Try to find the config
        const config = await prisma.config.findFirst({
            where: {
                OR: [
                    { slug: configName },
                    { name: configName }
                ]
            }
        });

        if (!config) {
            // Config not found, proceed (will 404 later)
            return next();
        }

        let configData: any;
        try {
            configData = JSON.parse(config.data);
        } catch {
            return next();
        }

        // Check if location lock is required
        if (!configData.locationLock) {
            return next();
        }

        // Location lock is required, validate user position
        const userPositionHeader = req.headers['x-user-position'] as string | undefined;
        
        if (!userPositionHeader) {
            return res.status(403).json({
                error: 'Location verification required',
                message: 'This configuration requires location verification. Please enable location services.',
                code: 'LOCATION_REQUIRED'
            });
        }

        // Parse position header "lng,lat"
        const [lngStr, latStr] = userPositionHeader.split(',');
        const userLng = parseFloat(lngStr);
        const userLat = parseFloat(latStr);

        if (!Number.isFinite(userLng) || !Number.isFinite(userLat)) {
            return res.status(400).json({
                error: 'Invalid location format',
                message: 'Location header must be in format: lng,lat',
                code: 'INVALID_LOCATION'
            });
        }

        // Check perimeter
        const center = configData.perimeterCenter as [number, number] | undefined;
        const radius = configData.perimeterRadius as number | undefined;

        if (!center || !Array.isArray(center) || center.length !== 2 || !Number.isFinite(radius) || radius <= 0) {
            // Invalid perimeter config, proceed anyway
            return next();
        }

        // Calculate distance using Haversine formula
        const distance = calculateDistance([userLng, userLat], center);

        if (distance > radius) {
            return res.status(403).json({
                error: 'Outside allowed area',
                message: 'Your location is outside the allowed geographic area for this configuration.',
                code: 'OUTSIDE_PERIMETER',
                distance,
                radius
            });
        }

        // User is within perimeter, proceed
        next();
    } catch (error) {
        // Log error but proceed (don't block on unexpected errors)
        console.warn('[locationLockMiddleware] Error:', error);
        next();
    }
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(point1: [number, number], point2: [number, number]): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const lat1 = toRad(point1[1]);
    const lat2 = toRad(point2[1]);
    const dLat = toRad(point2[1] - point1[1]);
    const dLng = toRad(point2[0] - point1[0]);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}
