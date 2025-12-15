import { PrismaClient as SqlitePrismaClient } from '@prisma/client';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * This script migrates data from SQLite to PostgreSQL
 * 
 * Usage:
 * 1. Ensure your SQLite database is populated (run seed script first)
 * 2. Set up a PostgreSQL database
 * 3. Set POSTGRES_URL in .env (e.g., postgresql://user:password@localhost:5432/maplibre)
 * 4. Run: npm run migrate:sqlite-to-pg
 */

async function migrate() {
  console.log('🚀 Starting SQLite to PostgreSQL migration...\n');

  // Connect to SQLite
  const sqlite = new SqlitePrismaClient({
    datasources: {
      db: {
        url: 'file:./dev.db'
      }
    }
  });

  // Connect to PostgreSQL
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    throw new Error('POSTGRES_URL environment variable not set');
  }

  const pg = new Client({ connectionString: postgresUrl });
  await pg.connect();

  try {
    // Create tables in PostgreSQL
    console.log('📝 Creating PostgreSQL tables...');
    await pg.query(`
      CREATE TABLE IF NOT EXISTS configs (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        data TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pg.query(`
      CREATE TABLE IF NOT EXISTS geojson (
        id TEXT PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        folder TEXT NOT NULL,
        data TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pg.query(`
      CREATE INDEX IF NOT EXISTS geojson_folder_idx ON geojson(folder);
    `);

    console.log('✅ Tables created\n');

    // Migrate configs
    console.log('📋 Migrating configs...');
    const configs = await sqlite.config.findMany();
    
    for (const config of configs) {
      await pg.query(
        `INSERT INTO configs (id, name, slug, data, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           data = EXCLUDED.data,
           "updatedAt" = EXCLUDED."updatedAt"`,
        [config.id, config.name, config.slug, config.data, config.createdAt, config.updatedAt]
      );
      console.log(`  ✅ ${config.name}`);
    }

    // Migrate GeoJSON
    console.log('\n🗺️  Migrating GeoJSON files...');
    const geojsons = await sqlite.geoJSON.findMany();
    
    for (const geojson of geojsons) {
      await pg.query(
        `INSERT INTO geojson (id, path, name, folder, data, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           path = EXCLUDED.path,
           name = EXCLUDED.name,
           folder = EXCLUDED.folder,
           data = EXCLUDED.data,
           "updatedAt" = EXCLUDED."updatedAt"`,
        [geojson.id, geojson.path, geojson.name, geojson.folder, geojson.data, geojson.createdAt, geojson.updatedAt]
      );
      console.log(`  ✅ ${geojson.path}`);
    }

    console.log('\n✨ Migration completed successfully!');
    
    // Display stats
    const configResult = await pg.query('SELECT COUNT(*) FROM configs');
    const geojsonResult = await pg.query('SELECT COUNT(*) FROM geojson');
    
    console.log(`\n📊 PostgreSQL Stats:`);
    console.log(`   Configs: ${configResult.rows[0].count}`);
    console.log(`   GeoJSON: ${geojsonResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sqlite.$disconnect();
    await pg.end();
  }
}

migrate();
