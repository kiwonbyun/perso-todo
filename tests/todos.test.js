const request = require('supertest')
const { createDb } = require('../src/main/db')
const { createServer } = require('../src/main/server')

describe('Todos API', () => {
  let app, db, personaId

  beforeEach(async () => {
    db = createDb(':memory:')
    app = createServer(db)
    const res = await request(app)
      .post('/api/personas')
      .send({ name: '직장인', color: '#89b4fa' })
    personaId = res.body.id
  })

  afterEach(() => db.close())

  test('GET /api/todos returns empty array initially', async () => {
    const res = await request(app).get('/api/todos')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  test('POST /api/todos creates a todo', async () => {
    const res = await request(app)
      .post('/api/todos')
      .send({ title: '보고서 작성', due_date: '2026-03-30', persona_id: personaId })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.title).toBe('보고서 작성')
    expect(res.body.completed).toBe(0)
  })

  test('POST /api/todos returns 400 if title missing', async () => {
    const res = await request(app).post('/api/todos').send({ due_date: '2026-03-30' })
    expect(res.status).toBe(400)
  })

  test('GET /api/todos filters by from/to date', async () => {
    await request(app).post('/api/todos').send({ title: '오늘 할 일', due_date: '2026-03-30' })
    await request(app).post('/api/todos').send({ title: '다음 달 할 일', due_date: '2026-04-15' })
    const res = await request(app).get('/api/todos?from=2026-03-01&to=2026-03-31')
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('오늘 할 일')
  })

  test('GET /api/todos filters by persona_id', async () => {
    await request(app).post('/api/todos').send({ title: '직장인 할 일', persona_id: personaId })
    await request(app).post('/api/todos').send({ title: '페르소나 없는 할 일' })
    const res = await request(app).get(`/api/todos?persona_id=${personaId}`)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('직장인 할 일')
  })

  test('PATCH /api/todos/:id marks as completed', async () => {
    const created = await request(app).post('/api/todos').send({ title: '할 일' })
    const res = await request(app)
      .patch(`/api/todos/${created.body.id}`)
      .send({ completed: 1 })
    expect(res.status).toBe(200)
    expect(res.body.completed).toBe(1)
    expect(res.body.completed_at).toBeDefined()
  })

  test('PATCH /api/todos/:id clears persona_id when set to null', async () => {
    const created = await request(app)
      .post('/api/todos')
      .send({ title: '할 일', persona_id: personaId })
    expect(created.body.persona_id).toBe(personaId)

    const res = await request(app)
      .patch(`/api/todos/${created.body.id}`)
      .send({ persona_id: null })
    expect(res.status).toBe(200)
    expect(res.body.persona_id).toBeNull()
  })

  test('DELETE /api/todos/:id removes todo', async () => {
    const created = await request(app).post('/api/todos').send({ title: '할 일' })
    const res = await request(app).delete(`/api/todos/${created.body.id}`)
    expect(res.status).toBe(204)
    const list = await request(app).get('/api/todos')
    expect(list.body).toHaveLength(0)
  })
})
