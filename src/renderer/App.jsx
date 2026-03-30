import { useState, useEffect } from 'react'
import { api } from './api'
import { Sidebar } from './components/Sidebar'
import { TodayView } from './components/TodayView'
import { WeekView } from './components/WeekView'
import { MonthView } from './components/MonthView'
import { Settings } from './components/Settings'
import { ToastProvider } from './components/Toast'
import './styles.css'

export function App() {
  const [view, setView] = useState('today')       // 'today' | 'week' | 'month' | 'settings'
  const [personaFilter, setPersonaFilter] = useState(null) // null = all
  const [personas, setPersonas] = useState([])
  const [defaultPersonaId, setDefaultPersonaId] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    api.getPersonas().then(setPersonas).catch(console.error)
    api.getSettings().then(s => {
      setDefaultPersonaId(s.default_persona_id ? Number(s.default_persona_id) : null)
    }).catch(console.error)
  }, [refreshKey])

  function refresh() { setRefreshKey(k => k + 1) }

  return (
    <>
    <div className="layout">
      <Sidebar
        view={view}
        onViewChange={setView}
        personas={personas}
        personaFilter={personaFilter}
        onPersonaFilterChange={setPersonaFilter}
      />
      <main className="main-content">
        {view === 'today' && (
          <TodayView personaFilter={personaFilter} personas={personas} defaultPersonaId={defaultPersonaId} onRefresh={refresh} />
        )}
        {view === 'week' && (
          <WeekView personaFilter={personaFilter} personas={personas} defaultPersonaId={defaultPersonaId} onRefresh={refresh} />
        )}
        {view === 'month' && (
          <MonthView personaFilter={personaFilter} personas={personas} defaultPersonaId={defaultPersonaId} onRefresh={refresh} />
        )}
        {view === 'settings' && (
          <Settings personas={personas} onRefresh={refresh} />
        )}
      </main>
    </div>
    <ToastProvider />
    </>
  )
}
