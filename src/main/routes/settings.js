const { Router } = require('express')
module.exports = function settingsRouter(db) {
  const router = Router()
  router.get('/', (req, res) => res.json({}))
  return router
}
