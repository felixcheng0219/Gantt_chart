export interface Group {
  id: number
  name: string
  color: string
  sort_order: number
  collapsed: number // 0 or 1
}

export interface GanttEvent {
  id: number
  group_id: number | null
  name: string
  start_date: string // YYYY-MM-DD
  end_date: string   // YYYY-MM-DD
  duration_days: number
  progress: number   // 0-100
  notes: string
  sort_order: number
  color: string | null
}

export interface Settings {
  current_view: string
  current_date: string
}

declare global {
  interface Window {
    api: {
      events: {
        getAll: () => Promise<GanttEvent[]>
        create: (data: Omit<GanttEvent, 'id'>) => Promise<GanttEvent>
        update: (id: number, data: Partial<GanttEvent>) => Promise<GanttEvent>
        delete: (id: number) => Promise<{ success: boolean }>
      }
      groups: {
        getAll: () => Promise<Group[]>
        create: (data: Omit<Group, 'id'>) => Promise<Group>
        update: (id: number, data: Partial<Group>) => Promise<Group>
        delete: (id: number) => Promise<{ success: boolean }>
      }
      settings: {
        get: (key: string) => Promise<string | null>
        set: (key: string, value: string) => Promise<{ success: boolean }>
      }
    }
  }
}
