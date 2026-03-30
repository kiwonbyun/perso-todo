# perso-todo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persona-based personal todo Electron desktop app (Windows) with SQLite storage, REST API via Express, and scheduled morning notifications to Windows + Slack.

**Architecture:** Electron main process embeds an Express API server on port 3001. React renderer (Vite, port 5173 in dev) communicates with Express via HTTP fetch. SQLite stores all data via better-sqlite3. node-cron triggers daily notifications. System tray keeps the app running in background.

**Tech Stack:** Electron 29, React 18, Vite 5, Express 4, better-sqlite3 9, node-cron 3, electron-builder 24, Jest 29, supertest 6

---

## File Map

```
perso-todo/
├── src/
│   ├── main/
│   │   ├── index.js          # Electron entry: window + tray + server bootstrap
│   │   ├── server.js         # Express app factory (exported for tests)
│   │   ├── db.js             # createDb(path) → SQLite instance + schema
│   │   ├── tray.js           # Tray icon + menu
│   │   ├── notify.js         # scheduleNotify(db) → cron job
│   │   └── routes/
│   │       ├── personas.js   # GET/POST/PATCH/DELETE /api/personas
│   │       ├── todos.js      # GET/POST/PATCH/DELETE /api/todos
│   │       └── settings.js   # GET/PATCH /api/settings
│   └── renderer/
│       ├── main.jsx          # React entry
│       ├── App.jsx           # Root: view state + Sidebar
│       ├── api.js            # fetch wrappers for all API calls
│       ├── styles.css        # CSS custom properties + global styles
│       └── components/
│           ├── Sidebar.jsx   # View nav + persona filter
│           ├── TodayView.jsx # Today's todos + overdue count
│           ├── WeekView.jsx  # Week calendar + day todo list
│           ├── MonthView.jsx # Month calendar + day todo list
│           ├── TodoList.jsx  # Renders list of TodoItem
│           ├── TodoItem.jsx  # Single todo row (checkbox, title, persona dot)
│           ├── TodoForm.jsx  # Create/edit modal
│           └── Settings.jsx  # Notification time, Slack URL, persona management
├── tests/
│   ├── db.test.js
│   ├── personas.test.js
│   ├── todos.test.js
│   ├── settings.test.js
│   └── notify.test.js
├── vite.config.js
├── electron-builder.json
├── jest.config.js
└── package.json
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `jest.config.js`
- Create: `src/main/index.js`
- Create: `src/renderer/main.jsx`
- Create: `index.html`

- [ ] **Step 1: Initialize package.json**

```json
{
  "name": "perso-todo",
  "version": "1.0.0",
  "description": "Persona-based personal todo app",
  "main": "src/main/index.js",
  "scripts": {
    "dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && cross-env NODE_ENV=development electron .\"",
    "build": "vite build",
    "dist": "npm run build && electron-builder",
    "start": "electron .",
    "test": "jest"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "express": "^4.18.2",
    "node-cron": "^3.0.3",
    "node-fetch": "^3.3.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "concurrently": "^8.2.2",
    "cross-env": "^7.0.3",
    "electron": "^29.1.0",
    "electron-builder": "^24.9.1",
    "electron-rebuild": "^3.2.9",
    "jest": "^29.7.0",
    "supertest": "^6.3.4",
    "vite": "^5.1.0",
    "wait-on": "^7.2.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/byeongiwon/Documents/perso-todo
npm install
npx electron-rebuild
```

Expected: node_modules created, better-sqlite3 rebuilt for Electron's Node ABI.

- [ ] **Step 3: Create vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist'
  },
  server: {
    port: 5173
  }
})
```

- [ ] **Step 4: Create jest.config.js**

```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js']
}
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>perso-todo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create minimal src/main/index.js**

```js
const { app, BrowserWindow } = require('electron')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
```

- [ ] **Step 7: Create minimal src/renderer/main.jsx**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <h1>perso-todo</h1>
  </React.StrictMode>
)
```

- [ ] **Step 8: Verify dev mode works**

```bash
npm run dev
```

Expected: Vite starts on 5173, Electron window opens showing "perso-todo" heading.

- [ ] **Step 9: Commit**

```bash
git add package.json vite.config.js jest.config.js index.html src/
git commit -m "feat: project scaffold with Electron + Vite + React"
```

---

### Task 2: Database Layer

**Files:**
- Create: `src/main/db.js`
- Create: `tests/db.test.js`

- [ ] **Step 1: Write failing test**

```js
// tests/db.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=db.test.js
```

Expected: FAIL — "Cannot find module '../src/main/db'"

- [ ] **Step 3: Create src/main/db.js**

```js
const Database = require('better-sqlite3')

function createDb(dbPath) {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS personas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL,
      icon       TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS todos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      memo         TEXT,
      due_date     TEXT,
      persona_id   INTEGER REFERENCES personas(id) ON DELETE SET NULL,
      completed    INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `)

  // Insert defaults only if not present
  db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_time', '08:00')
  `).run()

  db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('slack_webhook_url', '')
  `).run()

  return db
}

module.exports = { createDb }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=db.test.js
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/db.js tests/db.test.js
git commit -m "feat: SQLite database layer with schema"
```

---

### Task 3: Personas API

**Files:**
- Create: `src/main/routes/personas.js`
- Create: `src/main/server.js`
- Create: `tests/personas.test.js`

- [ ] **Step 1: Create src/main/server.js**

```js
const express = require('express')

function createServer(db) {
  const app = express()
  app.use(express.json())

  app.use('/api/personas', require('./routes/personas')(db))
  app.use('/api/todos', require('./routes/todos')(db))
  app.use('/api/settings', require('./routes/settings')(db))

  return app
}

module.exports = { createServer }
```

- [ ] **Step 2: Write failing personas test**

```js
// tests/personas.test.js
const request = require('supertest')
const { createDb } = require('../src/main/db')
const { createServer } = require('../src/main/server')

describe('Personas API', () => {
  let app, db

  beforeEach(() => {
    db = createDb(':memory:')
    // personas route is loaded lazily, need todos + settings stubs
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
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- --testPathPattern=personas.test.js
```

Expected: FAIL — "Cannot find module './routes/personas'"

- [ ] **Step 4: Create src/main/routes/personas.js**

```js
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
    const { id } = req.params
    db.prepare('DELETE FROM personas WHERE id = ?').run(id)
    res.status(204).end()
  })

  return router
}
```

- [ ] **Step 5: Create stub routes for todos and settings** (needed by server.js to load)

Create `src/main/routes/todos.js`:
```js
const { Router } = require('express')
module.exports = function todosRouter(db) {
  const router = Router()
  router.get('/', (req, res) => res.json([]))
  return router
}
```

Create `src/main/routes/settings.js`:
```js
const { Router } = require('express')
module.exports = function settingsRouter(db) {
  const router = Router()
  router.get('/', (req, res) => res.json({}))
  return router
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npm test -- --testPathPattern=personas.test.js
```

Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
git add src/main/server.js src/main/routes/
git add tests/personas.test.js
git commit -m "feat: personas REST API with CRUD"
```

---

### Task 4: Todos API

**Files:**
- Modify: `src/main/routes/todos.js`
- Create: `tests/todos.test.js`

- [ ] **Step 1: Write failing todos test**

```js
// tests/todos.test.js
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

  test('DELETE /api/todos/:id removes todo', async () => {
    const created = await request(app).post('/api/todos').send({ title: '할 일' })
    const res = await request(app).delete(`/api/todos/${created.body.id}`)
    expect(res.status).toBe(204)
    const list = await request(app).get('/api/todos')
    expect(list.body).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=todos.test.js
```

Expected: FAIL — GET returns [] but filter tests fail because stub doesn't implement filters.

- [ ] **Step 3: Implement src/main/routes/todos.js**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=todos.test.js
```

Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/routes/todos.js tests/todos.test.js
git commit -m "feat: todos REST API with date range and persona filters"
```

---

### Task 5: Settings API

**Files:**
- Modify: `src/main/routes/settings.js`
- Create: `tests/settings.test.js`

- [ ] **Step 1: Write failing settings test**

```js
// tests/settings.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=settings.test.js
```

Expected: FAIL — GET returns `{}` instead of object with keys.

- [ ] **Step 3: Implement src/main/routes/settings.js**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=settings.test.js
```

Expected: PASS (3 tests)

- [ ] **Step 5: Run all tests to verify nothing broken**

```bash
npm test
```

Expected: PASS (all tests from tasks 2–5)

- [ ] **Step 6: Commit**

```bash
git add src/main/routes/settings.js tests/settings.test.js
git commit -m "feat: settings REST API"
```

---

### Task 6: Notification System

**Files:**
- Create: `src/main/notify.js`
- Create: `tests/notify.test.js`

- [ ] **Step 1: Write failing notify test**

```js
// tests/notify.test.js
const { buildNotifyPayload } = require('../src/main/notify')

describe('buildNotifyPayload', () => {
  const today = '2026-03-30'

  test('returns empty lists when no todos', () => {
    const payload = buildNotifyPayload([], today)
    expect(payload.todayTodos).toEqual([])
    expect(payload.overdueTodos).toEqual([])
  })

  test('separates today todos from overdue', () => {
    const todos = [
      { id: 1, title: '오늘 할 일', due_date: '2026-03-30', completed: 0, persona_name: '직장인' },
      { id: 2, title: '밀린 할 일', due_date: '2026-03-28', completed: 0, persona_name: '남편' },
      { id: 3, title: '완료된 할 일', due_date: '2026-03-30', completed: 1, persona_name: '직장인' }
    ]
    const payload = buildNotifyPayload(todos, today)
    expect(payload.todayTodos).toHaveLength(1)
    expect(payload.todayTodos[0].title).toBe('오늘 할 일')
    expect(payload.overdueTodos).toHaveLength(1)
    expect(payload.overdueTodos[0].title).toBe('밀린 할 일')
  })

  test('buildSlackMessage formats correctly', () => {
    const { buildSlackMessage } = require('../src/main/notify')
    const payload = {
      date: '3월 30일',
      todayTodos: [{ title: '보고서 작성', persona_name: '직장인' }],
      overdueTodos: [{ title: '꽃 사기', persona_name: '남편', due_date: '2026-03-28' }]
    }
    const msg = buildSlackMessage(payload)
    expect(msg).toContain('3월 30일')
    expect(msg).toContain('[직장인] 보고서 작성')
    expect(msg).toContain('[남편] 꽃 사기')
    expect(msg).toContain('3/28')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern=notify.test.js
```

Expected: FAIL — "Cannot find module '../src/main/notify'"

- [ ] **Step 3: Create src/main/notify.js**

```js
const cron = require('node-cron')

function buildNotifyPayload(todos, today) {
  const incomplete = todos.filter(t => t.completed === 0)
  const todayTodos = incomplete.filter(t => t.due_date === today)
  const overdueTodos = incomplete.filter(t => t.due_date && t.due_date < today)
  return { todayTodos, overdueTodos }
}

function buildSlackMessage({ date, todayTodos, overdueTodos }) {
  let msg = `📋 오늘의 할 일 (${date})\n`

  if (todayTodos.length > 0) {
    msg += '\n오늘 마감\n'
    for (const t of todayTodos) {
      msg += `• [${t.persona_name || '없음'}] ${t.title}\n`
    }
  }

  if (overdueTodos.length > 0) {
    msg += '\n밀린 항목\n'
    for (const t of overdueTodos) {
      const d = t.due_date ? t.due_date.slice(5).replace('-', '/') : '날짜 없음'
      msg += `• [${t.persona_name || '없음'}] ${t.title} (${d} 마감)\n`
    }
  }

  return msg
}

async function sendSlackNotification(webhookUrl, message) {
  if (!webhookUrl) return
  const fetch = (await import('node-fetch')).default
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  })
}

function scheduleNotify(db, notifyFn) {
  let task = null

  function reload() {
    if (task) { task.stop(); task = null }

    const timeRow = db.prepare("SELECT value FROM settings WHERE key='notify_time'").get()
    const time = (timeRow && timeRow.value) || '08:00'
    const [hour, minute] = time.split(':')

    task = cron.schedule(`${minute} ${hour} * * *`, async () => {
      const today = new Date().toISOString().slice(0, 10)
      const todos = db.prepare(`
        SELECT t.*, p.name as persona_name
        FROM todos t
        LEFT JOIN personas p ON t.persona_id = p.id
        WHERE t.completed = 0
      `).all()

      const payload = buildNotifyPayload(todos, today)
      payload.date = formatKoreanDate(today)

      const webhookRow = db.prepare("SELECT value FROM settings WHERE key='slack_webhook_url'").get()
      const webhookUrl = webhookRow && webhookRow.value

      const slackMsg = buildSlackMessage(payload)
      await sendSlackNotification(webhookUrl, slackMsg)

      if (notifyFn) notifyFn(payload)
    })
  }

  reload()
  return { reload, stop: () => task && task.stop() }
}

function formatKoreanDate(isoDate) {
  const [, month, day] = isoDate.split('-')
  return `${parseInt(month)}월 ${parseInt(day)}일`
}

module.exports = { buildNotifyPayload, buildSlackMessage, scheduleNotify }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern=notify.test.js
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/main/notify.js tests/notify.test.js
git commit -m "feat: notification system with cron scheduling and Slack"
```

---

### Task 7: System Tray + Wire Up Main Process

**Files:**
- Create: `src/main/tray.js`
- Modify: `src/main/index.js`

- [ ] **Step 1: Create src/main/tray.js**

```js
const { Tray, Menu, nativeImage } = require('electron')
const path = require('path')

function createTray(win) {
  // Use a 16x16 empty icon as placeholder — replace with actual icon file at assets/tray-icon.png
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png')
  let icon
  try {
    icon = nativeImage.createFromPath(iconPath)
  } catch {
    icon = nativeImage.createEmpty()
  }

  const tray = new Tray(icon)
  tray.setToolTip('perso-todo')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '열기',
      click: () => {
        win.show()
        win.focus()
      }
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        tray.destroy()
        require('electron').app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    win.show()
    win.focus()
  })

  return tray
}

module.exports = { createTray }
```

- [ ] **Step 2: Create assets directory with placeholder icon**

```bash
mkdir -p /Users/byeongiwon/Documents/perso-todo/assets
# Create a 1x1 transparent PNG as placeholder
node -e "
const fs = require('fs');
// Minimal 16x16 transparent PNG (base64)
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAADUlEQVQ4jWNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==', 'base64');
fs.writeFileSync('assets/tray-icon.png', png);
console.log('Created placeholder icon');
"
```

Expected output: "Created placeholder icon"

- [ ] **Step 3: Rewrite src/main/index.js with full wiring**

```js
const { app, BrowserWindow, Notification } = require('electron')
const path = require('path')
const { createDb } = require('./db')
const { createServer } = require('./server')
const { createTray } = require('./tray')
const { scheduleNotify } = require('./notify')

const isDev = process.env.NODE_ENV === 'development'
const DB_PATH = isDev ? ':memory:' : path.join(app.getPath('userData'), 'todos.db')
const API_PORT = 3001

let win, tray, db, notifier

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  win.once('ready-to-show', () => win.show())

  win.on('close', (e) => {
    e.preventDefault()
    win.hide()
  })
}

app.whenReady().then(() => {
  db = createDb(DB_PATH)

  const server = createServer(db)
  server.listen(API_PORT, '127.0.0.1', () => {
    console.log(`API server running on port ${API_PORT}`)
  })

  createWindow()
  tray = createTray(win)

  notifier = scheduleNotify(db, (payload) => {
    if (Notification.isSupported()) {
      const total = payload.todayTodos.length + payload.overdueTodos.length
      new Notification({
        title: `오늘의 할 일 (${payload.date})`,
        body: `할 일 ${total}개가 있습니다.`
      }).show()
    }
  })
})

app.on('before-quit', () => {
  if (notifier) notifier.stop()
  if (db) db.close()
})
```

- [ ] **Step 4: Verify app still launches**

```bash
npm run dev
```

Expected: App opens, API server starts on port 3001. Check terminal for "API server running on port 3001".

- [ ] **Step 5: Verify API works**

In a new terminal:
```bash
curl http://localhost:3001/api/personas
```
Expected: `[]`

- [ ] **Step 6: Commit**

```bash
git add src/main/index.js src/main/tray.js assets/
git commit -m "feat: system tray, full main process wiring"
```

---

### Task 8: React Foundation — Layout, Sidebar, API Client

**Files:**
- Create: `src/renderer/styles.css`
- Create: `src/renderer/api.js`
- Modify: `src/renderer/main.jsx`
- Create: `src/renderer/App.jsx`
- Create: `src/renderer/components/Sidebar.jsx`

- [ ] **Step 1: Create src/renderer/styles.css**

```css
:root {
  --bg-base: #1e1e2e;
  --bg-mantle: #181825;
  --bg-surface0: #313244;
  --bg-surface1: #45475a;
  --text-primary: #cdd6f4;
  --text-subtle: #6c7086;
  --accent: #cba6f7;
  --green: #a6e3a1;
  --red: #f38ba8;
  --blue: #89b4fa;
  --peach: #fab387;
  --sidebar-width: 180px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg-base);
  color: var(--text-primary);
  font-size: 14px;
  height: 100vh;
  overflow: hidden;
}

#root { height: 100vh; }

button {
  cursor: pointer;
  border: none;
  background: none;
  color: inherit;
  font-size: inherit;
}

input, textarea {
  background: var(--bg-surface0);
  border: 1px solid var(--bg-surface1);
  color: var(--text-primary);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 14px;
  outline: none;
  width: 100%;
}

input:focus, textarea:focus {
  border-color: var(--accent);
}

.layout {
  display: flex;
  height: 100vh;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Sidebar */
.sidebar {
  width: var(--sidebar-width);
  background: var(--bg-mantle);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-right: 1px solid var(--bg-surface0);
  flex-shrink: 0;
}

.sidebar-logo {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  padding: 4px 8px;
  margin-bottom: 8px;
}

.sidebar-section-label {
  font-size: 11px;
  color: var(--text-subtle);
  padding: 8px 8px 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-subtle);
  transition: background 0.1s;
}

.sidebar-item:hover { background: var(--bg-surface0); }
.sidebar-item.active { background: var(--bg-surface0); color: var(--text-primary); }

.persona-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sidebar-bottom {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--bg-surface0);
}

/* View header */
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.view-title { font-size: 20px; font-weight: 600; }

.btn-primary {
  background: var(--accent);
  color: var(--bg-base);
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}

.btn-primary:hover { opacity: 0.9; }

/* Todo list */
.todo-list { display: flex; flex-direction: column; gap: 6px; }

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-surface0);
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
}

.todo-item.completed { opacity: 0.45; }

.todo-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--bg-surface1);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s, border-color 0.1s;
}

.todo-checkbox.checked {
  background: var(--green);
  border-color: var(--green);
}

.todo-body { flex: 1; min-width: 0; }

.todo-title {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.todo-item.completed .todo-title { text-decoration: line-through; }

.todo-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.todo-persona {
  font-size: 11px;
  color: var(--text-subtle);
}

.todo-date {
  font-size: 11px;
  color: var(--text-subtle);
}

.todo-date.overdue { color: var(--red); }

.section-label {
  font-size: 12px;
  color: var(--text-subtle);
  margin: 16px 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--bg-mantle);
  border-radius: 12px;
  padding: 24px;
  width: 420px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-title { font-size: 16px; font-weight: 600; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 12px; color: var(--text-subtle); }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.btn-ghost {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-subtle);
}

.btn-ghost:hover { background: var(--bg-surface0); }

select {
  background: var(--bg-surface0);
  border: 1px solid var(--bg-surface1);
  color: var(--text-primary);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 14px;
  width: 100%;
  outline: none;
}

/* Week view */
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 20px;
}

.week-day {
  text-align: center;
  padding: 8px 4px;
  border-radius: 8px;
  cursor: pointer;
}

.week-day:hover { background: var(--bg-surface0); }
.week-day.active { background: var(--bg-surface0); }
.week-day.today { background: var(--bg-surface0); }

.week-day-label { font-size: 11px; color: var(--text-subtle); }
.week-day-num { font-size: 15px; font-weight: 500; margin: 2px 0; }
.week-day.today .week-day-num { color: var(--accent); }

.week-dots {
  display: flex;
  justify-content: center;
  gap: 2px;
  min-height: 6px;
}

/* Month view */
.month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.month-title { font-size: 18px; font-weight: 600; }

.month-nav { display: flex; gap: 8px; }
.month-nav button {
  padding: 4px 10px;
  border-radius: 6px;
  color: var(--text-subtle);
  font-size: 16px;
}

.month-nav button:hover { background: var(--bg-surface0); }

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.month-day-label {
  text-align: center;
  font-size: 11px;
  color: var(--text-subtle);
  padding: 4px 0;
}

.month-cell {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
}

.month-cell:hover { background: var(--bg-surface0); }
.month-cell.active { background: var(--bg-surface0); }

.month-cell-num {
  font-size: 12px;
  margin-bottom: 2px;
}

.month-cell.today .month-cell-num { color: var(--accent); font-weight: 700; }
.month-cell.other-month .month-cell-num { color: var(--bg-surface1); }

.month-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  justify-content: center;
}

/* Settings */
.settings-section {
  background: var(--bg-surface0);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.settings-section-title {
  font-size: 12px;
  color: var(--text-subtle);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.settings-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--bg-surface1);
}

.settings-row:last-child { border-bottom: none; }

.settings-row-label { font-size: 14px; }

.settings-row input {
  width: 160px;
  text-align: right;
}

.persona-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--bg-surface1);
}

.persona-row:last-child { border-bottom: none; }

.persona-row-actions { margin-left: auto; display: flex; gap: 4px; }

.btn-icon {
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--text-subtle);
}

.btn-icon:hover { background: var(--bg-surface1); }

.btn-danger { color: var(--red); }

.color-swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Create src/renderer/api.js**

```js
const BASE = 'http://localhost:3001'

async function req(method, path, body) {
  const opts = { method, headers: {} }
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(BASE + path, opts)
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Todos
  getTodos: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return req('GET', `/api/todos${qs ? '?' + qs : ''}`)
  },
  createTodo: (data) => req('POST', '/api/todos', data),
  updateTodo: (id, data) => req('PATCH', `/api/todos/${id}`, data),
  deleteTodo: (id) => req('DELETE', `/api/todos/${id}`),

  // Personas
  getPersonas: () => req('GET', '/api/personas'),
  createPersona: (data) => req('POST', '/api/personas', data),
  updatePersona: (id, data) => req('PATCH', `/api/personas/${id}`, data),
  deletePersona: (id) => req('DELETE', `/api/personas/${id}`),

  // Settings
  getSettings: () => req('GET', '/api/settings'),
  updateSettings: (data) => req('PATCH', '/api/settings', data)
}
```

- [ ] **Step 3: Create src/renderer/App.jsx**

```jsx
import { useState, useEffect } from 'react'
import { api } from './api'
import { Sidebar } from './components/Sidebar'
import { TodayView } from './components/TodayView'
import { WeekView } from './components/WeekView'
import { MonthView } from './components/MonthView'
import { Settings } from './components/Settings'
import './styles.css'

export function App() {
  const [view, setView] = useState('today')       // 'today' | 'week' | 'month' | 'settings'
  const [personaFilter, setPersonaFilter] = useState(null) // null = all
  const [personas, setPersonas] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    api.getPersonas().then(setPersonas).catch(console.error)
  }, [refreshKey])

  function refresh() { setRefreshKey(k => k + 1) }

  return (
    <div className="layout">
      <Sidebar
        view={view}
        onViewChange={setView}
        personas={personas}
        personaFilter={personaFilter}
        onPersonaFilterChange={setPersonaFilter}
      />
      <main className="main-content">
        {view === 'today' && (
          <TodayView personaFilter={personaFilter} personas={personas} onRefresh={refresh} />
        )}
        {view === 'week' && (
          <WeekView personaFilter={personaFilter} personas={personas} onRefresh={refresh} />
        )}
        {view === 'month' && (
          <MonthView personaFilter={personaFilter} personas={personas} onRefresh={refresh} />
        )}
        {view === 'settings' && (
          <Settings personas={personas} onRefresh={refresh} />
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Update src/renderer/main.jsx**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 5: Create src/renderer/components/Sidebar.jsx**

```jsx
export function Sidebar({ view, onViewChange, personas, personaFilter, onPersonaFilterChange }) {
  const views = [
    { id: 'today', label: '📅 오늘' },
    { id: 'week', label: '📆 이번 주' },
    { id: 'month', label: '🗓 월간' }
  ]

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">perso-todo</div>

      <div className="sidebar-section-label">뷰</div>
      {views.map(v => (
        <div
          key={v.id}
          className={`sidebar-item ${view === v.id ? 'active' : ''}`}
          onClick={() => onViewChange(v.id)}
        >
          {v.label}
        </div>
      ))}

      <div className="sidebar-section-label">페르소나</div>
      <div
        className={`sidebar-item ${personaFilter === null ? 'active' : ''}`}
        onClick={() => onPersonaFilterChange(null)}
      >
        전체
      </div>
      {personas.map(p => (
        <div
          key={p.id}
          className={`sidebar-item ${personaFilter === p.id ? 'active' : ''}`}
          onClick={() => onPersonaFilterChange(p.id)}
        >
          <span className="persona-dot" style={{ background: p.color }} />
          {p.name}
        </div>
      ))}

      <div className="sidebar-bottom">
        <div
          className={`sidebar-item ${view === 'settings' ? 'active' : ''}`}
          onClick={() => onViewChange('settings')}
        >
          ⚙ 설정
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 6: Verify app renders with sidebar**

```bash
npm run dev
```

Expected: App opens with sidebar on left showing "오늘 / 이번 주 / 월간 / ⚙ 설정". Main area shows "undefined" or blank — that's OK, views not yet implemented.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/
git commit -m "feat: React foundation — layout, sidebar, API client, styles"
```

---

### Task 9: Today View

**Files:**
- Create: `src/renderer/components/TodayView.jsx`
- Create: `src/renderer/components/TodoList.jsx`
- Create: `src/renderer/components/TodoItem.jsx`

- [ ] **Step 1: Create src/renderer/components/TodoItem.jsx**

```jsx
export function TodoItem({ todo, persona, onToggle, onClick }) {
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = todo.due_date && todo.due_date < today && !todo.completed

  return (
    <div
      className={`todo-item ${todo.completed ? 'completed' : ''}`}
      onClick={() => onClick(todo)}
    >
      <div
        className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
        style={!todo.completed && persona ? { borderColor: persona.color } : {}}
        onClick={(e) => { e.stopPropagation(); onToggle(todo) }}
      >
        {todo.completed && <span style={{ fontSize: 10, color: '#1e1e2e', fontWeight: 700 }}>✓</span>}
      </div>
      <div className="todo-body">
        <div className="todo-title">{todo.title}</div>
        <div className="todo-meta">
          {persona && (
            <span className="todo-persona" style={{ color: persona.color }}>
              {persona.name}
            </span>
          )}
          {todo.due_date && (
            <span className={`todo-date ${isOverdue ? 'overdue' : ''}`}>
              {formatDate(todo.due_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(isoDate) {
  const [, m, d] = isoDate.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}
```

- [ ] **Step 2: Create src/renderer/components/TodoList.jsx**

```jsx
import { TodoItem } from './TodoItem'

export function TodoList({ todos, personas, onToggle, onEdit }) {
  const personaMap = Object.fromEntries(personas.map(p => [p.id, p]))

  if (todos.length === 0) {
    return <div style={{ color: 'var(--text-subtle)', fontSize: 14, padding: '20px 0' }}>할 일이 없습니다.</div>
  }

  return (
    <div className="todo-list">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          persona={todo.persona_id ? personaMap[todo.persona_id] : null}
          onToggle={onToggle}
          onClick={onEdit}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create src/renderer/components/TodayView.jsx**

```jsx
import { useState, useEffect } from 'react'
import { api } from '../api'
import { TodoList } from './TodoList'
import { TodoForm } from './TodoForm'

export function TodayView({ personaFilter, personas, onRefresh }) {
  const [todos, setTodos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTodo, setEditTodo] = useState(null)

  const today = new Date().toISOString().slice(0, 10)

  function load() {
    const params = { from: today, to: today }
    if (personaFilter) params.persona_id = personaFilter
    api.getTodos(params).then(setTodos).catch(console.error)
  }

  useEffect(() => { load() }, [personaFilter])

  async function handleToggle(todo) {
    await api.updateTodo(todo.id, { completed: todo.completed ? 0 : 1 })
    load()
  }

  async function handleSave(data) {
    if (editTodo) {
      await api.updateTodo(editTodo.id, data)
    } else {
      await api.createTodo({ ...data, due_date: data.due_date || today })
    }
    setShowForm(false)
    setEditTodo(null)
    load()
    onRefresh()
  }

  async function handleDelete(id) {
    await api.deleteTodo(id)
    setShowForm(false)
    setEditTodo(null)
    load()
    onRefresh()
  }

  function openEdit(todo) {
    setEditTodo(todo)
    setShowForm(true)
  }

  const incomplete = todos.filter(t => !t.completed)
  const completed = todos.filter(t => t.completed)

  const dateLabel = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div>
      <div className="view-header">
        <h1 className="view-title">오늘 · {dateLabel}</h1>
        <button className="btn-primary" onClick={() => { setEditTodo(null); setShowForm(true) }}>
          + 추가
        </button>
      </div>

      <TodoList todos={incomplete} personas={personas} onToggle={handleToggle} onEdit={openEdit} />

      {completed.length > 0 && (
        <>
          <div className="section-label">완료됨 ({completed.length})</div>
          <TodoList todos={completed} personas={personas} onToggle={handleToggle} onEdit={openEdit} />
        </>
      )}

      {showForm && (
        <TodoForm
          todo={editTodo}
          personas={personas}
          defaultDate={today}
          onSave={handleSave}
          onDelete={editTodo ? handleDelete : null}
          onClose={() => { setShowForm(false); setEditTodo(null) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify Today view renders**

```bash
npm run dev
```

Expected: "오늘 · 날짜" heading with "+ 추가" button. TodoForm import will error until next task — that's OK, add a stub to unblock:

Create empty `src/renderer/components/TodoForm.jsx`:
```jsx
export function TodoForm() { return null }
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/TodoItem.jsx
git add src/renderer/components/TodoList.jsx
git add src/renderer/components/TodayView.jsx
git add src/renderer/components/TodoForm.jsx
git commit -m "feat: today view with todo list and items"
```

---

### Task 10: TodoForm Modal

**Files:**
- Modify: `src/renderer/components/TodoForm.jsx`

- [ ] **Step 1: Implement src/renderer/components/TodoForm.jsx**

```jsx
import { useState } from 'react'

export function TodoForm({ todo, personas, defaultDate, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(todo?.title ?? '')
  const [memo, setMemo] = useState(todo?.memo ?? '')
  const [dueDate, setDueDate] = useState(todo?.due_date ?? defaultDate ?? '')
  const [personaId, setPersonaId] = useState(todo?.persona_id ?? '')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    await onSave({
      title: title.trim(),
      memo: memo.trim() || null,
      due_date: dueDate || null,
      persona_id: personaId || null
    })
  }

  async function handleDelete() {
    if (window.confirm('이 할 일을 삭제하시겠어요?')) {
      await onDelete(todo.id)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">{todo ? '할 일 수정' : '새 할 일'}</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">제목 *</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="할 일을 입력하세요"
            />
          </div>

          <div className="form-group">
            <label className="form-label">마감일</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">페르소나</label>
            <select value={personaId} onChange={e => setPersonaId(e.target.value)}>
              <option value="">없음</option>
              {personas.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">메모</label>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="메모 (선택)"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-actions">
            {onDelete && (
              <button type="button" className="btn-icon btn-danger" onClick={handleDelete}>
                삭제
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={onClose}>취소</button>
            <button type="submit" className="btn-primary" disabled={!title.trim()}>
              {todo ? '저장' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify create and edit flow**

```bash
npm run dev
```

Test:
1. Click "+ 추가" → modal opens
2. Enter title "보고서 작성", pick persona (if any), click "추가"
3. Todo appears in list
4. Click todo → modal opens with existing data
5. Change title, click "저장" → updated in list
6. Open todo, click "삭제", confirm → removed from list

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/TodoForm.jsx
git commit -m "feat: todo create/edit modal"
```

---

### Task 11: Week View

**Files:**
- Create: `src/renderer/components/WeekView.jsx`

- [ ] **Step 1: Create src/renderer/components/WeekView.jsx**

```jsx
import { useState, useEffect } from 'react'
import { api } from '../api'
import { TodoList } from './TodoList'
import { TodoForm } from './TodoForm'

function getWeekDates(date) {
  const d = new Date(date)
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1 // Mon=0, Sun=6
  const monday = new Date(d)
  monday.setDate(d.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return dd.toISOString().slice(0, 10)
  })
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export function WeekView({ personaFilter, personas, onRefresh }) {
  const today = new Date().toISOString().slice(0, 10)
  const [weekDates, setWeekDates] = useState(() => getWeekDates(today))
  const [selectedDate, setSelectedDate] = useState(today)
  const [todos, setTodos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTodo, setEditTodo] = useState(null)

  const from = weekDates[0]
  const to = weekDates[6]

  function load() {
    const params = { from, to }
    if (personaFilter) params.persona_id = personaFilter
    api.getTodos(params).then(setTodos).catch(console.error)
  }

  useEffect(() => { load() }, [from, to, personaFilter])

  function todosForDate(date) {
    return todos.filter(t => t.due_date === date)
  }

  async function handleToggle(todo) {
    await api.updateTodo(todo.id, { completed: todo.completed ? 0 : 1 })
    load()
  }

  async function handleSave(data) {
    if (editTodo) {
      await api.updateTodo(editTodo.id, data)
    } else {
      await api.createTodo({ ...data, due_date: data.due_date || selectedDate })
    }
    setShowForm(false)
    setEditTodo(null)
    load()
    onRefresh()
  }

  async function handleDelete(id) {
    await api.deleteTodo(id)
    setShowForm(false)
    setEditTodo(null)
    load()
    onRefresh()
  }

  const selectedTodos = todosForDate(selectedDate)

  return (
    <div>
      <div className="view-header">
        <h1 className="view-title">이번 주</h1>
        <button className="btn-primary" onClick={() => { setEditTodo(null); setShowForm(true) }}>
          + 추가
        </button>
      </div>

      <div className="week-grid">
        {weekDates.map((date, i) => {
          const dayTodos = todosForDate(date)
          const colors = [...new Set(
            dayTodos.map(t => personas.find(p => p.id === t.persona_id)?.color).filter(Boolean)
          )].slice(0, 4)
          return (
            <div
              key={date}
              className={`week-day ${date === selectedDate ? 'active' : ''} ${date === today ? 'today' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <div className="week-day-label">{DAY_LABELS[i]}</div>
              <div className="week-day-num">{parseInt(date.slice(8))}</div>
              <div className="week-dots">
                {colors.map((c, ci) => (
                  <div key={ci} style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 14, color: 'var(--text-subtle)', marginBottom: 12 }}>
        {formatKoreanDate(selectedDate)}
      </div>

      <TodoList
        todos={selectedTodos}
        personas={personas}
        onToggle={handleToggle}
        onEdit={(todo) => { setEditTodo(todo); setShowForm(true) }}
      />

      {showForm && (
        <TodoForm
          todo={editTodo}
          personas={personas}
          defaultDate={selectedDate}
          onSave={handleSave}
          onDelete={editTodo ? handleDelete : null}
          onClose={() => { setShowForm(false); setEditTodo(null) }}
        />
      )}
    </div>
  )
}

function formatKoreanDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
}
```

- [ ] **Step 2: Verify week view**

```bash
npm run dev
```

Click "이번 주" in sidebar → week grid appears. Click a date to see its todos.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/WeekView.jsx
git commit -m "feat: week view with day navigation"
```

---

### Task 12: Month View

**Files:**
- Create: `src/renderer/components/MonthView.jsx`

- [ ] **Step 1: Create src/renderer/components/MonthView.jsx**

```jsx
import { useState, useEffect } from 'react'
import { api } from '../api'
import { TodoList } from './TodoList'
import { TodoForm } from './TodoForm'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function getMonthCells(year, month) {
  // Returns array of {date, otherMonth} for 6-week grid starting Monday
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
  const cells = []
  for (let i = -startOffset; i < 42 - startOffset; i++) {
    const d = new Date(year, month, 1 + i)
    cells.push({
      date: d.toISOString().slice(0, 10),
      otherMonth: d.getMonth() !== month
    })
  }
  return cells
}

export function MonthView({ personaFilter, personas, onRefresh }) {
  const today = new Date().toISOString().slice(0, 10)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState(today)
  const [todos, setTodos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTodo, setEditTodo] = useState(null)

  const cells = getMonthCells(year, month)
  const from = cells[0].date
  const to = cells[cells.length - 1].date

  function load() {
    const params = { from, to }
    if (personaFilter) params.persona_id = personaFilter
    api.getTodos(params).then(setTodos).catch(console.error)
  }

  useEffect(() => { load() }, [from, to, personaFilter])

  function todosForDate(date) {
    return todos.filter(t => t.due_date === date)
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  async function handleToggle(todo) {
    await api.updateTodo(todo.id, { completed: todo.completed ? 0 : 1 })
    load()
  }

  async function handleSave(data) {
    if (editTodo) {
      await api.updateTodo(editTodo.id, data)
    } else {
      await api.createTodo({ ...data, due_date: data.due_date || selectedDate })
    }
    setShowForm(false)
    setEditTodo(null)
    load()
    onRefresh()
  }

  async function handleDelete(id) {
    await api.deleteTodo(id)
    setShowForm(false)
    setEditTodo(null)
    load()
    onRefresh()
  }

  const selectedTodos = todosForDate(selectedDate)

  return (
    <div>
      <div className="month-header">
        <h1 className="month-title">{year}년 {month + 1}월</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="month-nav">
            <button onClick={prevMonth}>‹</button>
            <button onClick={nextMonth}>›</button>
          </div>
          <button className="btn-primary" onClick={() => { setEditTodo(null); setShowForm(true) }}>
            + 추가
          </button>
        </div>
      </div>

      <div className="month-grid">
        {DAY_LABELS.map(l => (
          <div key={l} className="month-day-label">{l}</div>
        ))}
        {cells.map(({ date, otherMonth }) => {
          const dayTodos = todosForDate(date)
          const colors = [...new Set(
            dayTodos.filter(t => !t.completed).map(t => personas.find(p => p.id === t.persona_id)?.color).filter(Boolean)
          )].slice(0, 4)
          return (
            <div
              key={date}
              className={`month-cell ${date === today ? 'today' : ''} ${otherMonth ? 'other-month' : ''} ${date === selectedDate ? 'active' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <div className="month-cell-num">{parseInt(date.slice(8))}</div>
              <div className="month-dots">
                {colors.map((c, i) => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 14, color: 'var(--text-subtle)', marginBottom: 12 }}>
            {formatKoreanDate(selectedDate)}
          </div>
          <TodoList
            todos={selectedTodos}
            personas={personas}
            onToggle={handleToggle}
            onEdit={(todo) => { setEditTodo(todo); setShowForm(true) }}
          />
        </div>
      )}

      {showForm && (
        <TodoForm
          todo={editTodo}
          personas={personas}
          defaultDate={selectedDate}
          onSave={handleSave}
          onDelete={editTodo ? handleDelete : null}
          onClose={() => { setShowForm(false); setEditTodo(null) }}
        />
      )}
    </div>
  )
}

function formatKoreanDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
}
```

- [ ] **Step 2: Verify month view**

```bash
npm run dev
```

Click "월간" in sidebar → calendar grid appears. Navigate months with ‹ › buttons.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/MonthView.jsx
git commit -m "feat: month calendar view with day selection"
```

---

### Task 13: Settings Screen

**Files:**
- Create: `src/renderer/components/Settings.jsx`

- [ ] **Step 1: Create src/renderer/components/Settings.jsx**

```jsx
import { useState, useEffect } from 'react'
import { api } from '../api'

const PRESET_COLORS = ['#89b4fa', '#f38ba8', '#a6e3a1', '#fab387', '#cba6f7', '#f9e2af', '#94e2d5', '#eba0ac']

export function Settings({ personas, onRefresh }) {
  const [notifyTime, setNotifyTime] = useState('08:00')
  const [slackUrl, setSlackUrl] = useState('')
  const [saved, setSaved] = useState(false)

  // Persona form
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  useEffect(() => {
    api.getSettings().then(s => {
      if (s.notify_time) setNotifyTime(s.notify_time)
      if (s.slack_webhook_url) setSlackUrl(s.slack_webhook_url)
    })
  }, [])

  async function saveSettings(e) {
    e.preventDefault()
    await api.updateSettings({ notify_time: notifyTime, slack_webhook_url: slackUrl })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addPersona(e) {
    e.preventDefault()
    if (!newName.trim()) return
    await api.createPersona({ name: newName.trim(), color: newColor })
    setNewName('')
    setNewColor(PRESET_COLORS[0])
    onRefresh()
  }

  function startEdit(p) {
    setEditingId(p.id)
    setEditName(p.name)
    setEditColor(p.color)
  }

  async function saveEdit(id) {
    await api.updatePersona(id, { name: editName, color: editColor })
    setEditingId(null)
    onRefresh()
  }

  async function deletePersona(id) {
    if (!window.confirm('이 페르소나를 삭제하시겠어요? 해당 페르소나의 할 일은 페르소나 없음으로 변경됩니다.')) return
    await api.deletePersona(id)
    onRefresh()
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="view-header">
        <h1 className="view-title">설정</h1>
      </div>

      {/* Notification settings */}
      <form onSubmit={saveSettings}>
        <div className="settings-section">
          <div className="settings-section-title">알림</div>

          <div className="settings-row">
            <span className="settings-row-label">알림 시간</span>
            <input
              type="time"
              value={notifyTime}
              onChange={e => setNotifyTime(e.target.value)}
              style={{ width: 120 }}
            />
          </div>

          <div className="settings-row">
            <span className="settings-row-label">Slack Webhook URL</span>
          </div>
          <input
            type="url"
            value={slackUrl}
            onChange={e => setSlackUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            style={{ marginTop: 8 }}
          />
        </div>

        <button type="submit" className="btn-primary" style={{ marginBottom: 16 }}>
          {saved ? '저장됨 ✓' : '알림 설정 저장'}
        </button>
      </form>

      {/* Persona management */}
      <div className="settings-section">
        <div className="settings-section-title">페르소나 관리</div>

        {personas.map(p => (
          <div key={p.id} className="persona-row">
            {editingId === p.id ? (
              <>
                <div
                  className="color-swatch"
                  style={{ background: editColor }}
                  onClick={() => {
                    const idx = PRESET_COLORS.indexOf(editColor)
                    setEditColor(PRESET_COLORS[(idx + 1) % PRESET_COLORS.length])
                  }}
                />
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  style={{ flex: 1 }}
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && saveEdit(p.id)}
                />
                <button className="btn-icon" onClick={() => saveEdit(p.id)}>✓</button>
                <button className="btn-icon" onClick={() => setEditingId(null)}>✕</button>
              </>
            ) : (
              <>
                <div className="color-swatch" style={{ background: p.color }} />
                <span style={{ flex: 1 }}>{p.name}</span>
                <div className="persona-row-actions">
                  <button className="btn-icon" onClick={() => startEdit(p)}>✎</button>
                  <button className="btn-icon btn-danger" onClick={() => deletePersona(p.id)}>🗑</button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add new persona */}
        <form onSubmit={addPersona} style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <div
            className="color-swatch"
            style={{ background: newColor, cursor: 'pointer', flexShrink: 0 }}
            onClick={() => {
              const idx = PRESET_COLORS.indexOf(newColor)
              setNewColor(PRESET_COLORS[(idx + 1) % PRESET_COLORS.length])
            }}
            title="클릭으로 색상 변경"
          />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="새 페르소나 이름"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" disabled={!newName.trim()}>추가</button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify settings screen**

```bash
npm run dev
```

Click "⚙ 설정":
1. Set notify time → click save → "저장됨 ✓" appears
2. Add persona with name + color (click color swatch to cycle) → appears in list + sidebar
3. Edit persona name → inline edit, press Enter to save
4. Delete persona → confirm dialog → removed

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/Settings.jsx
git commit -m "feat: settings screen with notifications and persona management"
```

---

### Task 14: Production Build Config

**Files:**
- Create: `electron-builder.json`
- Create: `.gitignore`

- [ ] **Step 1: Create electron-builder.json**

```json
{
  "appId": "com.perso-todo.app",
  "productName": "perso-todo",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "src/main/**/*",
    "assets/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  "win": {
    "target": "nsis",
    "icon": "assets/tray-icon.png"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "installerLanguages": ["ko"]
  },
  "extraMetadata": {
    "main": "src/main/index.js"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
release/
.superpowers/
*.db
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: `dist/` directory created with React bundle files.

- [ ] **Step 4: Test production mode**

In `src/main/index.js`, temporarily set `isDev = false` and run `npm start`.

Expected: App loads from `dist/index.html`. API calls work.

Revert `isDev` to use `process.env.NODE_ENV === 'development'`.

- [ ] **Step 5: Commit**

```bash
git add electron-builder.json .gitignore
git commit -m "feat: electron-builder config for Windows production build"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Electron desktop app (Windows) | Task 1, 14 |
| React + Vite frontend | Task 1 |
| Express API server | Task 3–5 |
| SQLite with personas, todos, settings | Task 2 |
| Personas CRUD | Task 3, 13 |
| Todos CRUD with due date, persona, memo | Task 4, 10 |
| Today view | Task 9 |
| Week view | Task 11 |
| Month view | Task 12 |
| Sidebar navigation + persona filter | Task 8 |
| Windows native notifications | Task 6, 7 |
| Slack Webhook notifications | Task 6 |
| Notification time configurable | Task 13 |
| System tray (minimize to tray) | Task 7 |
| Data stored in %APPDATA% | Task 7 |

All requirements covered. ✓
