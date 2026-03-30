import { useState, useEffect } from 'react'
import { api } from '../api'
import { TodoList } from './TodoList'
import { TodoForm } from './TodoForm'

function ClearState({ allDone }) {
  return (
    <div className="clear-state">
      <div className="clear-character">
        {allDone ? (
          <>
            <div className="clear-char-art">{'  ∧＿∧  \n( ･ω･ )ﾉ\n  /  づ✦'}</div>
            <div className="clear-title">전부 해냈어요!</div>
            <div className="clear-sub">오늘도 수고했어요 ☆</div>
          </>
        ) : (
          <>
            <div className="clear-char-art">{'  ∧＿∧  \n(´• ω •`)\n  |  づ  '}</div>
            <div className="clear-title">할 일이 없어요</div>
            <div className="clear-sub">여유로운 하루네요 ☁︎</div>
          </>
        )}
      </div>
    </div>
  )
}

export function TodayView({ personaFilter, personas, defaultPersonaId, onRefresh }) {
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

  async function handleDirectDelete(todo) {
    await api.deleteTodo(todo.id)
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

      {incomplete.length === 0 && todos.length === 0 && <ClearState allDone={false} />}
      {incomplete.length === 0 && todos.length > 0 && <ClearState allDone={true} />}

      <TodoList todos={incomplete} personas={personas} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDirectDelete} />

      {completed.length > 0 && (
        <>
          <div className="section-label">완료됨 ({completed.length})</div>
          <TodoList todos={completed} personas={personas} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDirectDelete} />
        </>
      )}

      {showForm && (
        <TodoForm
          todo={editTodo}
          personas={personas}
          defaultDate={today}
          defaultPersonaId={defaultPersonaId}
          onSave={handleSave}
          onDelete={editTodo ? handleDelete : null}
          onClose={() => { setShowForm(false); setEditTodo(null) }}
        />
      )}
    </div>
  )
}
