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
  getTodos: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return req('GET', `/api/todos${qs ? '?' + qs : ''}`)
  },
  createTodo: (data) => req('POST', '/api/todos', data),
  updateTodo: (id, data) => req('PATCH', `/api/todos/${id}`, data),
  deleteTodo: (id) => req('DELETE', `/api/todos/${id}`),

  getPersonas: () => req('GET', '/api/personas'),
  createPersona: (data) => req('POST', '/api/personas', data),
  updatePersona: (id, data) => req('PATCH', `/api/personas/${id}`, data),
  deletePersona: (id) => req('DELETE', `/api/personas/${id}`),

  getSettings: () => req('GET', '/api/settings'),
  updateSettings: (data) => req('PATCH', '/api/settings', data),

  getOg: (url) => req('GET', `/api/og?url=${encodeURIComponent(url)}`),
  testNotify: () => req('POST', '/api/notify/test')
}
