import { useState } from 'react'

export function TodoForm({ todo, personas, defaultDate, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(todo?.title ?? '')
  const [memo, setMemo] = useState(todo?.memo ?? '')
  const [dueDate, setDueDate] = useState(todo?.due_date ?? defaultDate ?? '')
  const [personaId, setPersonaId] = useState(todo?.persona_id ?? '')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    await onSave({
      title: title.trim(),
      memo: memo.trim() || null,
      due_date: dueDate || null,
      persona_id: personaId || null
    })
  }

  async function handleDelete() {
    if (window.confirm('이 할 일을 삭제하시겠어요?')) {
      await onDelete(todo.id)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">{todo ? '할 일 수정' : '새 할 일'}</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">제목 *</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="할 일을 입력하세요"
            />
          </div>

          <div className="form-group">
            <label className="form-label">마감일</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">페르소나</label>
            <select value={personaId} onChange={e => setPersonaId(e.target.value)}>
              <option value="">없음</option>
              {personas.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">메모</label>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="메모 (선택)"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-actions">
            {onDelete && (
              <button type="button" className="btn-icon btn-danger" onClick={handleDelete}>
                삭제
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={onClose}>취소</button>
            <button type="submit" className="btn-primary" disabled={!title.trim()}>
              {todo ? '저장' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
