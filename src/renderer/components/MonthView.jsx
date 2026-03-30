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
