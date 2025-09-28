// vite.config.ts
import { defineConfig, type Plugin, type PreviewServer } from 'vite'
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

function icsProxy(): Plugin {
  const handle = async (req: any, res: any) => {
    try {
      const u = new URL(req.url, 'http://local')
      const target = u.searchParams.get('url')
      if (!target || !/^https?:\/\//i.test(target)) {
        res.statusCode = 400
        res.setHeader('content-type', 'text/plain; charset=utf-8')
        res.end('Missing or invalid url')
        return
      }
      const r = await fetch(target)
      const txt = await r.text()
      res.statusCode = 200
      res.setHeader('content-type', 'text/calendar; charset=utf-8')
      res.setHeader('cache-control', 'no-store')
      res.setHeader('access-control-allow-origin', '*')
      res.end(txt)
    } catch (e: any) {
      res.statusCode = 502
      res.setHeader('content-type', 'text/plain; charset=utf-8')
      res.end('Proxy error: ' + (e?.message || String(e)))
    }
  }
  return {
    name: 'ics-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ics', handle)
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use('/api/ics', handle)
    }
  }
}

export default defineConfig({
  plugins: [react(), publicConfigsVirtual(), icsProxy()],
  //base: '/preview/', // <== IMPORTANT
})
