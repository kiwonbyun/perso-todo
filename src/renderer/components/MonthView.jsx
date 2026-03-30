import { useState, useEffect } from 'react'
import { api } from '../api'
import { TodoForm } from './TodoForm'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function getMonthCells(year, month) {
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

export function MonthView({ personaFilter, personas, defaultPersonaId, onRefresh }) {
  const today = new Date().toISOString().slice(0, 10)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [todos, setTodos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editTodo, setEditTodo] = useState(null)
  const [formDate, setFormDate] = useState(today)

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
      await api.createTodo({ ...data, due_date: data.due_date || formDate })
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

  function openNewForm(date) {
    setFormDate(date)
    setEditTodo(null)
    setShowForm(true)
  }

  function openEdit(e, todo) {
    e.stopPropagation()
    setEditTodo(todo)
    setFormDate(todo.due_date)
    setShowForm(true)
  }

  return (
    <div className="month-view">
      <div className="month-header">
        <h1 className="month-title">{year}년 {month + 1}월</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="month-nav">
            <button onClick={prevMonth}>‹</button>
            <button onClick={nextMonth}>›</button>
          </div>
          <button className="btn-primary" onClick={() => openNewForm(today)}>
            + 추가
          </button>
        </div>
      </div>

      <div className="month-cal">
        {DAY_LABELS.map(l => (
          <div key={l} className="month-day-label">{l}</div>
        ))}
        {cells.map(({ date, otherMonth }) => {
          const dayTodos = todosForDate(date)
          const visible = dayTodos.slice(0, 3)
          const overflow = dayTodos.length - visible.length
          return (
            <div
              key={date}
              className={`month-cal-cell ${date === today ? 'today' : ''} ${otherMonth ? 'other-month' : ''}`}
              onClick={() => openNewForm(date)}
            >
              <div className={`month-cal-num ${date === today ? 'today-num' : ''}`}>
                {parseInt(date.slice(8))}
              </div>
              {visible.map(todo => {
                const persona = personas.find(p => p.id === todo.persona_id)
                return (
                  <div
                    key={todo.id}
                    className={`month-cal-todo ${todo.completed ? 'completed' : ''}`}
                    style={persona ? { background: persona.color + '33', borderLeft: `2px solid ${persona.color}` } : {}}
                    onClick={(e) => openEdit(e, todo)}
                  >
                    {todo.title}
                  </div>
                )
              })}
              {overflow > 0 && (
                <div className="month-cal-more">+{overflow}개 더</div>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <TodoForm
          todo={editTodo}
          personas={personas}
          defaultDate={formDate}
          defaultPersonaId={defaultPersonaId}
          onSave={handleSave}
          onDelete={editTodo ? handleDelete : null}
          onClose={() => { setShowForm(false); setEditTodo(null) }}
        />
      )}
    </div>
  )
}
