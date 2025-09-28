export default async function handler(req: any, res: any) {
    try {
        const target = (req.query.url as string | undefined) || undefined
        if (!target || !/^https?:\/\//i.test(target)) {
            res.status(400).send('Missing or invalid url')
            return
        }

        const r = await fetch(target)
        const txt = await r.text()

        res.setHeader('content-type', 'text/calendar; charset=utf-8')
        res.setHeader('cache-control', 'no-store')
        res.setHeader('access-control-allow-origin', '*')
        res.status(200).send(txt)
    } catch (e: any) {
        res.status(502).send('Proxy error: ' + (e?.message || String(e)))
    }
}
