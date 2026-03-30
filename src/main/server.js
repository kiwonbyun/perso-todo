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
