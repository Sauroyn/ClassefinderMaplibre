// vite.config.ts
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function publicConfigsVirtual(): Plugin {
  const VIRTUAL_ID = 'virtual:public-configs'
  const RESOLVED = VIRTUAL_ID
  const cfgDir = path.resolve(process.cwd(), 'public', 'configs')
  const listFiles = () => {
    try {
      const files = fs.readdirSync(cfgDir)
      return files.filter((f: string) => f.toLowerCase().endsWith('.json'))
    } catch {
      return [] as string[]
    }
  }
  return {
    name: 'public-configs-virtual',
    resolveId(id) { if (id === VIRTUAL_ID) return RESOLVED },
    load(id) {
      if (id === RESOLVED) {
        const files = listFiles()
        return `export default ${JSON.stringify(files)};`
      }
    },
    configureServer(server) {
      const watcher = server.watcher
      const onChange = (p: string) => {
        const normalized = p.replace(/\\/g, '/')
        if (normalized.includes('/public/configs/') && normalized.endsWith('.json')) {
          // invalidate the virtual module and trigger full reload
          try { server.moduleGraph.invalidateModule(server.moduleGraph.getModuleById(RESOLVED)!) } catch { }
          server.ws.send({ type: 'full-reload' })
        }
      }
      watcher.on('add', onChange)
      watcher.on('unlink', onChange)
      watcher.on('change', onChange)
    }
  }
}

export default defineConfig({
  plugins: [react(), publicConfigsVirtual()],
  base: '/preview/', // <== IMPORTANT
})
