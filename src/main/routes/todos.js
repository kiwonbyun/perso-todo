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

    // Build dynamic SET clause — only update fields that were explicitly sent
    const fields = []
    const params = []

    if ('title' in req.body && req.body.title) {
      fields.push('title = ?')
      params.push(req.body.title)
    }
    if ('memo' in req.body) {
      fields.push('memo = ?')
      params.push(req.body.memo ?? null)
    }
    if ('due_date' in req.body) {
      fields.push('due_date = ?')
      params.push(req.body.due_date ?? null)
    }
    if ('persona_id' in req.body) {
      fields.push('persona_id = ?')
      params.push(req.body.persona_id ?? null)
    }
    if ('completed' in req.body) {
      const completed = req.body.completed
      fields.push('completed = ?')
      params.push(completed)
      if (completed === 1) {
        fields.push('completed_at = ?')
        params.push(new Date().toISOString())
      } else if (completed === 0) {
        fields.push('completed_at = ?')
        params.push(null)
      }
    }

    if (fields.length > 0) {
      params.push(id)
      db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`).run(...params)
    }

    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id)
    res.json(row)
  })

  router.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id)
    res.status(204).end()
  })

  return router
}
