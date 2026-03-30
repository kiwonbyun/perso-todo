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
