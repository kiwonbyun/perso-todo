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
