const { Router } = require('express')

module.exports = function personasRouter(db) {
  const router = Router()

  router.get('/', (req, res) => {
    const rows = db.prepare('SELECT * FROM personas ORDER BY sort_order, id').all()
    res.json(rows)
  })

  router.post('/', (req, res) => {
    const { name, color, icon, sort_order = 0 } = req.body
    if (!name || !color) return res.status(400).json({ error: 'name and color required' })
    const result = db.prepare(
      'INSERT INTO personas (name, color, icon, sort_order) VALUES (?, ?, ?, ?)'
    ).run(name, color, icon || null, sort_order)
    const row = db.prepare('SELECT * FROM personas WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(row)
  })

  router.patch('/:id', (req, res) => {
    const { id } = req.params
    const existing = db.prepare('SELECT * FROM personas WHERE id = ?').get(id)
    if (!existing) return res.status(404).json({ error: 'not found' })
    const { name, color, icon, sort_order } = req.body
    db.prepare(`
      UPDATE personas SET
        name = COALESCE(?, name),
        color = COALESCE(?, color),
        icon = COALESCE(?, icon),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).run(name ?? null, color ?? null, icon ?? null, sort_order ?? null, id)
    const row = db.prepare('SELECT * FROM personas WHERE id = ?').get(id)
    res.json(row)
  })

  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM personas WHERE id = ?').run(req.params.id)
    res.status(204).end()
  })

  return router
}
