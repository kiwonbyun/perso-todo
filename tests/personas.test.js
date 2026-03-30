const request = require('supertest')
const { createDb } = require('../src/main/db')
const { createServer } = require('../src/main/server')

describe('Personas API', () => {
  let app, db

  beforeEach(() => {
    db = createDb(':memory:')
    app = createServer(db)
  })

  afterEach(() => db.close())

  test('GET /api/personas returns empty array initially', async () => {
    const res = await request(app).get('/api/personas')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  test('POST /api/personas creates a persona', async () => {
    const res = await request(app)
      .post('/api/personas')
      .send({ name: '직장인', color: '#89b4fa' })
    expect(res.status).toBe(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.name).toBe('직장인')
    expect(res.body.color).toBe('#89b4fa')
  })

  test('POST /api/personas returns 400 if name missing', async () => {
    const res = await request(app)
      .post('/api/personas')
      .send({ color: '#89b4fa' })
    expect(res.status).toBe(400)
  })

  test('PATCH /api/personas/:id updates name', async () => {
    const created = await request(app)
      .post('/api/personas')
      .send({ name: '직장인', color: '#89b4fa' })
    const res = await request(app)
      .patch(`/api/personas/${created.body.id}`)
      .send({ name: '회사원' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('회사원')
  })

  test('DELETE /api/personas/:id removes persona', async () => {
    const created = await request(app)
      .post('/api/personas')
      .send({ name: '직장인', color: '#89b4fa' })
    const res = await request(app).delete(`/api/personas/${created.body.id}`)
    expect(res.status).toBe(204)
    const list = await request(app).get('/api/personas')
    expect(list.body).toHaveLength(0)
  })
})
