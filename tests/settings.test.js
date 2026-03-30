const request = require('supertest')
const { createDb } = require('../src/main/db')
const { createServer } = require('../src/main/server')

describe('Settings API', () => {
  let app, db

  beforeEach(() => {
    db = createDb(':memory:')
    app = createServer(db)
  })

  afterEach(() => db.close())

  test('GET /api/settings returns default settings object', async () => {
    const res = await request(app).get('/api/settings')
    expect(res.status).toBe(200)
    expect(res.body.notify_time).toBe('08:00')
    expect(res.body.slack_webhook_url).toBe('')
  })

  test('PATCH /api/settings updates notify_time', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .send({ notify_time: '09:30' })
    expect(res.status).toBe(200)
    expect(res.body.notify_time).toBe('09:30')
  })

  test('PATCH /api/settings updates slack_webhook_url', async () => {
    const res = await request(app)
      .patch('/api/settings')
      .send({ slack_webhook_url: 'https://hooks.slack.com/xxx' })
    expect(res.status).toBe(200)
    expect(res.body.slack_webhook_url).toBe('https://hooks.slack.com/xxx')
  })
})
