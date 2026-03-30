const { createDb } = require('../src/main/db')

describe('createDb', () => {
  let db

  beforeEach(() => {
    db = createDb(':memory:')
  })

  afterEach(() => {
    db.close()
  })

  test('creates personas table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='personas'").get()
    expect(row).toBeDefined()
    expect(row.name).toBe('personas')
  })

  test('creates todos table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='todos'").get()
    expect(row).toBeDefined()
  })

  test('creates settings table', () => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'").get()
    expect(row).toBeDefined()
  })

  test('inserts default notify_time setting', () => {
    const row = db.prepare("SELECT value FROM settings WHERE key='notify_time'").get()
    expect(row).toBeDefined()
    expect(row.value).toBe('08:00')
  })
})
