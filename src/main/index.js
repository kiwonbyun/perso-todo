const { app, BrowserWindow, Notification } = require('electron')
const path = require('path')
const { createDb } = require('./db')
const { createServer } = require('./server')
const { createTray } = require('./tray')
const { scheduleNotify } = require('./notify')

const isDev = process.env.NODE_ENV === 'development'
const DB_PATH = path.join(isDev ? require('os').tmpdir() : app.getPath('userData'), 'perso-todo-dev.db')
const API_PORT = 3001

let win, tray, db, server, notifier, isQuitting = false

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
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
    if (!isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })
}

app.whenReady().then(() => {
  db = createDb(DB_PATH)

  server = createServer(db, { onNotifyChange: () => notifier && notifier.reload() })
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${API_PORT} already in use. Retrying...`)
      setTimeout(() => server.listen(API_PORT, '127.0.0.1'), 1000)
    }
  })
  server.listen(API_PORT, '127.0.0.1', () => {
    console.log(`API server running on port ${API_PORT}`)
  })

  server.post('/api/notify/test', async (req, res) => {
    await notifier.fireNow()
    res.json({ ok: true })
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
  isQuitting = true
  if (notifier) notifier.stop()
  if (server) server.close()
  if (db) db.close()
})
