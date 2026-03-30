const { Router } = require('express')

module.exports = function settingsRouter(db) {
  const router = Router()

  router.get('/', (req, res) => {
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const obj = {}
    for (const row of rows) obj[row.key] = row.value
    res.json(obj)
  })

  router.patch('/', (req, res) => {
    const allowed = ['notify_time', 'slack_webhook_url']
    const updates = Object.entries(req.body).filter(([k]) => allowed.includes(k))
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    for (const [key, value] of updates) upsert.run(key, value)
    const rows = db.prepare('SELECT key, value FROM settings').all()
    const obj = {}
    for (const row of rows) obj[row.key] = row.value
    res.json(obj)
  })

  return router
}
