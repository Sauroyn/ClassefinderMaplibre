import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schema
const configSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  data: z.any() // GeoJSON can be any valid JSON
});

// GET /api/configs - List all configs
router.get('/', async (req, res, next) => {
  try {
    const configs = await prisma.config.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(configs);
  } catch (error) {
    next(error);
  }
});

// GET /api/configs/:slug - Get specific config
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const config = await prisma.config.findUnique({
      where: { slug }
    });

    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    res.json({
      ...config,
      data: JSON.parse(config.data)
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/configs - Create new config
router.post('/', async (req, res, next) => {
  try {
    const validated = configSchema.parse(req.body);
    
    const config = await prisma.config.create({
      data: {
        name: validated.name,
        slug: validated.slug,
        data: JSON.stringify(validated.data)
      }
    });

    res.status(201).json({
      ...config,
      data: JSON.parse(config.data)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// PUT /api/configs/:slug - Update config
router.put('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const validated = configSchema.partial().parse(req.body);

    const updateData: any = {};
    if (validated.name) updateData.name = validated.name;
    if (validated.slug) updateData.slug = validated.slug;
    if (validated.data) updateData.data = JSON.stringify(validated.data);

    const config = await prisma.config.update({
      where: { slug },
      data: updateData
    });

    res.json({
      ...config,
      data: JSON.parse(config.data)
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    next(error);
  }
});

// DELETE /api/configs/:slug - Delete config
router.delete('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    await prisma.config.delete({
      where: { slug }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
