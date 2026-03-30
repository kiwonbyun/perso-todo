const { Router } = require('express')

module.exports = function todosRouter(db) {
  const router = Router()

  router.get('/', (req, res) => {
    const { from, to, persona_id } = req.query
    let query = 'SELECT * FROM todos WHERE 1=1'
    const params = []

    if (from && to) {
      query += ' AND due_date >= ? AND due_date <= ?'
      params.push(from, to)
    }
    if (persona_id) {
      query += ' AND persona_id = ?'
      params.push(persona_id)
    }

    query += ' ORDER BY completed ASC, due_date ASC, created_at ASC'
    const rows = db.prepare(query).all(...params)
    res.json(rows)
  })

  router.post('/', (req, res) => {
    const { title, memo, due_date, persona_id } = req.body
    if (!title) return res.status(400).json({ error: 'title required' })
    const result = db.prepare(
      'INSERT INTO todos (title, memo, due_date, persona_id) VALUES (?, ?, ?, ?)'
    ).run(title, memo || null, due_date || null, persona_id || null)
    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(row)
  })

  router.patch('/:id', (req, res) => {
    const { id } = req.params
    const existing = db.prepare('SELECT * FROM todos WHERE id = ?').get(id)
    if (!existing) return res.status(404).json({ error: 'not found' })

    const { title, memo, due_date, persona_id, completed } = req.body
    const completedAt = completed === 1 ? new Date().toISOString() : (completed === 0 ? null : undefined)

    db.prepare(`
      UPDATE todos SET
        title = COALESCE(?, title),
        memo = COALESCE(?, memo),
        due_date = COALESCE(?, due_date),
        persona_id = COALESCE(?, persona_id),
        completed = COALESCE(?, completed),
        completed_at = CASE WHEN ? IS NOT NULL THEN ? ELSE completed_at END
      WHERE id = ?
    `).run(
      title ?? null,
      memo ?? null,
      due_date ?? null,
      persona_id ?? null,
      completed ?? null,
      completedAt !== undefined ? completedAt : null,
      completedAt !== undefined ? completedAt : null,
      id
    )

    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id)
    res.json(row)
  })

  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id)
    res.status(204).end()
  })

  return router
}
