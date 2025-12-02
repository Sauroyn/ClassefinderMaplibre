import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schema
const geojsonSchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  folder: z.string().min(1),
  data: z.any() // GeoJSON can be any valid JSON
});

// GET /api/geojson - List all GeoJSON files
router.get('/', async (req, res, next) => {
  try {
    const { folder } = req.query;
    
    const where = folder ? { folder: folder as string } : undefined;
    
    const geojsons = await prisma.geoJSON.findMany({
      where,
      select: {
        id: true,
        path: true,
        name: true,
        folder: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [{ folder: 'asc' }, { name: 'asc' }]
    });
    
    res.json(geojsons);
  } catch (error) {
    next(error);
  }
});

// GET /api/geojson/:id - Get specific GeoJSON
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const geojson = await prisma.geoJSON.findUnique({
      where: { id }
    });

    if (!geojson) {
      return res.status(404).json({ error: 'GeoJSON not found' });
    }

    res.json({
      ...geojson,
      data: JSON.parse(geojson.data)
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/geojson/by-path/:path - Get GeoJSON by path
router.get('/by-path/*', async (req, res, next) => {
  try {
    // Extract full path after /by-path/
    const path = req.params[0];
    
    const geojson = await prisma.geoJSON.findUnique({
      where: { path }
    });

    if (!geojson) {
      return res.status(404).json({ error: 'GeoJSON not found' });
    }

    res.json({
      ...geojson,
      data: JSON.parse(geojson.data)
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/geojson - Create new GeoJSON
router.post('/', async (req, res, next) => {
  try {
    const validated = geojsonSchema.parse(req.body);
    
    const geojson = await prisma.geoJSON.create({
      data: {
        path: validated.path,
        name: validated.name,
        folder: validated.folder,
        data: JSON.stringify(validated.data)
      }
    });

    res.status(201).json({
      ...geojson,
      data: JSON.parse(geojson.data)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PUT /api/geojson/:id - Update GeoJSON
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = geojsonSchema.partial().parse(req.body);

    const updateData: any = {};
    if (validated.path) updateData.path = validated.path;
    if (validated.name) updateData.name = validated.name;
    if (validated.folder) updateData.folder = validated.folder;
    if (validated.data) updateData.data = JSON.stringify(validated.data);

    const geojson = await prisma.geoJSON.update({
      where: { id },
      data: updateData
    });

    res.json({
      ...geojson,
      data: JSON.parse(geojson.data)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// DELETE /api/geojson/:id - Delete GeoJSON
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.geoJSON.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
