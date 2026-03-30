const express = require('express')

function parseOg(html, url) {
  const get = (prop) => {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'),
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m) return m[1]
    }
    return null
  }
  const title = get('title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || null
  return {
    title,
    description: get('description'),
    image: get('image'),
    siteName: get('site_name'),
    url: get('url') || url
  }
}

function createServer(db, { onNotifyChange } = {}) {
  const app = express()
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })
  app.use(express.json())

  app.use('/api/personas', require('./routes/personas')(db))
  app.use('/api/todos', require('./routes/todos')(db))
  app.use('/api/settings', require('./routes/settings')(db, { onNotifyChange }))

  app.get('/api/og', async (req, res) => {
    const { url } = req.query
    if (!url) return res.status(400).json({ error: 'url required' })
    try {
      const html = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; perso-todo/1.0)' },
        signal: AbortSignal.timeout(5000)
      }).then(r => r.text())
      res.json(parseOg(html, url))
    } catch (e) {
      res.status(502).json({ error: e.message })
    }
  })

  return app
}

module.exports = { createServer }
