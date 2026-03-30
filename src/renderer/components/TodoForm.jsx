import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const URL_RE = /(https?:\/\/[^\s]+)/g

export function TodoForm({ todo, personas, defaultDate, defaultPersonaId, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState(todo?.title ?? '')
  const [memo, setMemo] = useState(todo?.memo ?? '')
  const [dueDate, setDueDate] = useState(todo?.due_date ?? defaultDate ?? '')
  const [personaId, setPersonaId] = useState(todo ? (todo.persona_id ?? '') : (defaultPersonaId ?? ''))
  const [ogData, setOgData] = useState(null)
  const [ogLoading, setOgLoading] = useState(false)
  const ogUrlRef = useRef(null)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Extract first URL from memo and fetch OG
  useEffect(() => {
    URL_RE.lastIndex = 0
    const match = URL_RE.exec(memo)
    const url = match ? match[1] : null
    if (!url || url === ogUrlRef.current) return
    ogUrlRef.current = url
    setOgData(null)
    setOgLoading(true)
    api.getOg(url)
      .then(data => { setOgData(data); setOgLoading(false) })
      .catch(() => setOgLoading(false))
  }, [memo])

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

  const hasUrl = (() => { URL_RE.lastIndex = 0; return URL_RE.test(memo) })()

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
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">페르소나</label>
            <select value={personaId} onChange={e => setPersonaId(e.target.value)}>
              <option value="">없음</option>
              {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
            {hasUrl && !ogLoading && !ogData && (
              <div className="memo-link-preview">
                <MemoWithLinks text={memo} />
              </div>
            )}
            {ogLoading && (
              <div className="og-preview og-loading">링크 미리보기 로딩 중…</div>
            )}
            {ogData && (ogData.title || ogData.description) && (
              <OgCard og={ogData} />
            )}
          </div>

          <div className="form-actions">
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

function OgCard({ og }) {
  return (
    <div
      className="og-preview"
      onClick={() => window.electronAPI?.openExternal(og.url)}
      style={{ cursor: og.url ? 'pointer' : 'default' }}
    >
      {og.image && (
        <img src={og.image} alt="" className="og-image" onError={e => e.target.style.display = 'none'} />
      )}
      <div className="og-text">
        {og.siteName && <div className="og-site">{og.siteName}</div>}
        {og.title && <div className="og-title">{og.title}</div>}
        {og.description && <div className="og-desc">{og.description}</div>}
      </div>
    </div>
  )
}

function MemoWithLinks({ text }) {
  const parts = text.split(URL_RE)
  URL_RE.lastIndex = 0
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href="#"
        className="memo-link"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.electronAPI?.openExternal(part) }}
      >
        {part}
      </a>
    ) : part
  )
}
