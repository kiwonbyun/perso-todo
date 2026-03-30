import { useState, useEffect } from 'react'
import { api } from '../api'
import { TodoList } from './TodoList'
import { TodoForm } from './TodoForm'

function getWeekDates(date) {
  const d = new Date(date)
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return dd.toISOString().slice(0, 10)
  })
}

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export function WeekView({ personaFilter, personas, defaultPersonaId, onRefresh }) {
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

  async function handleDirectDelete(todo) {
    await api.deleteTodo(todo.id)
    load()
    onRefresh()
  }

  const selectedTodos = todosForDate(selectedDate)
  const incomplete = selectedTodos.filter(t => !t.completed)
  const allDone = selectedTodos.length > 0 && incomplete.length === 0
  const empty = selectedTodos.length === 0

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
          const dayIncomplete = dayTodos.filter(t => !t.completed).length
          const dayTotal = dayTodos.length
          const allClear = dayTotal > 0 && dayIncomplete === 0
          return (
            <div
              key={date}
              className={`week-day ${date === selectedDate ? 'active' : ''} ${date === today ? 'today' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <div className="week-day-label">{DAY_LABELS[i]}</div>
              <div className="week-day-num">{parseInt(date.slice(8))}</div>
              {dayTotal > 0 && (
                <div className={`week-day-count ${allClear ? 'all-clear' : ''}`}>
                  {allClear ? '✓' : `${dayIncomplete}/${dayTotal}`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: 15, color: 'var(--text-subtle)', marginBottom: 14 }}>
        {formatKoreanDate(selectedDate)}
        {!empty && (
          <span style={{ marginLeft: 10, color: allDone ? 'var(--green)' : 'var(--accent)', fontWeight: 600 }}>
            {allDone ? '모두 완료 ✓' : `${incomplete.length}/${selectedTodos.length}`}
          </span>
        )}
      </div>

      {(empty || allDone) ? (
        <ClearState allDone={allDone} />
      ) : (
        <TodoList
          todos={selectedTodos}
          personas={personas}
          onToggle={handleToggle}
          onEdit={(todo) => { setEditTodo(todo); setShowForm(true) }}
          onDelete={handleDirectDelete}
        />
      )}

      {showForm && (
        <TodoForm
          todo={editTodo}
          personas={personas}
          defaultDate={selectedDate}
          defaultPersonaId={defaultPersonaId}
          onSave={handleSave}
          onDelete={editTodo ? handleDelete : null}
          onClose={() => { setShowForm(false); setEditTodo(null) }}
        />
      )}
    </div>
  )
}

function ClearState({ allDone }) {
  return (
    <div className="clear-state">
      <div className="clear-character">
        {allDone ? (
          <>
            <div className="clear-char-art">
              {'  ∧＿∧  '}
              <br />
              {'( ･ω･ )ﾉ'}
              <br />
              {'  /  づ✦'}
            </div>
            <div className="clear-title">전부 해냈어요!</div>
            <div className="clear-sub">오늘도 수고했어요 ☆</div>
          </>
        ) : (
          <>
            <div className="clear-char-art">
              {'  ∧＿∧  '}
              <br />
              {'(´• ω •`)'}
              <br />
              {'  |  づ  '}
            </div>
            <div className="clear-title">할 일이 없어요</div>
            <div className="clear-sub">여유로운 하루네요 ☁︎</div>
          </>
        )}
      </div>
    </div>
  )
}

function formatKoreanDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
}
