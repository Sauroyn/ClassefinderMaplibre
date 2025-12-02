import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting seed...');

  // Path to public directory
  const publicDir = path.join(__dirname, '../../../public');
  const configsDir = path.join(publicDir, 'configs');
  const geojsonDir = path.join(publicDir, 'geojson');

  try {
    // 1. Seed Configs
    console.log('\n📋 Seeding configs...');
    const configFiles = await fs.readdir(configsDir);
    
    for (const file of configFiles) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(configsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      const name = file.replace('.json', '');
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      
      await prisma.config.upsert({
        where: { slug },
        update: {
          name,
          data: content
        },
        create: {
          name,
          slug,
          data: content
        }
      });
      
      console.log(`  ✅ ${name}`);
    }

    // 2. Seed GeoJSON files
    console.log('\n🗺️  Seeding GeoJSON files...');
    
    async function processDirectory(dirPath: string, relativePath: string = '') {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        const newRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name;
        
        if (item.isDirectory()) {
          // Recursively process subdirectories
          await processDirectory(fullPath, newRelativePath);
        } else if (item.name.endsWith('.geojson')) {
          // Process GeoJSON file
          const content = await fs.readFile(fullPath, 'utf-8');
          const name = item.name.replace('.geojson', '');
          const folder = relativePath || 'root';
          
          await prisma.geoJSON.upsert({
            where: { path: newRelativePath },
            update: {
              name,
              folder,
              data: content
            },
            create: {
              path: newRelativePath,
              name,
              folder,
              data: content
            }
          });
          
          console.log(`  ✅ ${newRelativePath}`);
        }
      }
    }
    
    await processDirectory(geojsonDir);

    console.log('\n✨ Seed completed successfully!');
    
    // Display stats
    const configCount = await prisma.config.count();
    const geojsonCount = await prisma.geoJSON.count();
    console.log(`\n📊 Stats:`);
    console.log(`   Configs: ${configCount}`);
    console.log(`   GeoJSON: ${geojsonCount}`);
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
