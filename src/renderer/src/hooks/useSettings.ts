import { useState, useEffect, useCallback, useRef } from 'react'
import { ViewMode } from '../types'

export function useSettings() {
  const [currentDate, setCurrentDate] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [currentView, setCurrentView] = useState<ViewMode>('month')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const load = async () => {
      const date = await window.api.settings.get('current_date')
      const view = await window.api.settings.get('current_view')
      if (date) setCurrentDate(date)
      const validViews: ViewMode[] = ['day', 'week', 'month', 'quarter', 'year']
      if (view && validViews.includes(view as ViewMode)) setCurrentView(view as ViewMode)
    }
    load()
  }, [])

  const debouncedSave = useCallback((key: string, value: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      window.api.settings.set(key, value)
    }, 500)
  }, [])

  const updateCurrentDate = useCallback((date: string) => {
    setCurrentDate(date)
    debouncedSave('current_date', date)
  }, [debouncedSave])

  const updateCurrentView = useCallback((view: ViewMode) => {
    setCurrentView(view)
    debouncedSave('current_view', view)
  }, [debouncedSave])

  return { currentDate, currentView, updateCurrentDate, updateCurrentView }
}
