import { ipcMain } from 'electron'
import { getDb } from './db'

export function registerIpcHandlers(): void {
  // ── Events ──────────────────────────────────────────────────────────────
  ipcMain.handle('events:getAll', () => {
    const db = getDb()
    return db.prepare('SELECT * FROM events ORDER BY sort_order ASC, id ASC').all()
  })

  ipcMain.handle('events:create', (_e, data: {
    group_id: number | null
    name: string
    start_date: string
    end_date: string
    duration_days: number
    progress: number
    notes: string
    sort_order: number
    color: string | null
  }) => {
    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO events (group_id, name, start_date, end_date, duration_days, progress, notes, sort_order, color)
      VALUES (@group_id, @name, @start_date, @end_date, @duration_days, @progress, @notes, @sort_order, @color)
    `)
    const result = stmt.run(data)
    return db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('events:update', (_e, id: number, data: {
    group_id?: number | null
    name?: string
    start_date?: string
    end_date?: string
    duration_days?: number
    progress?: number
    notes?: string
    sort_order?: number
    color?: string | null
  }) => {
    const db = getDb()
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE events SET ${fields} WHERE id = @id`).run({ ...data, id })
    return db.prepare('SELECT * FROM events WHERE id = ?').get(id)
  })

  ipcMain.handle('events:delete', (_e, id: number) => {
    const db = getDb()
    db.prepare('DELETE FROM events WHERE id = ?').run(id)
    return { success: true }
  })

  // ── Groups ──────────────────────────────────────────────────────────────
  ipcMain.handle('groups:getAll', () => {
    const db = getDb()
    return db.prepare('SELECT * FROM groups ORDER BY sort_order ASC, id ASC').all()
  })

  ipcMain.handle('groups:create', (_e, data: {
    name: string
    color: string
    sort_order: number
  }) => {
    const db = getDb()
    const result = db.prepare(
      'INSERT INTO groups (name, color, sort_order) VALUES (@name, @color, @sort_order)'
    ).run(data)
    return db.prepare('SELECT * FROM groups WHERE id = ?').get(result.lastInsertRowid)
  })

  ipcMain.handle('groups:update', (_e, id: number, data: {
    name?: string
    color?: string
    sort_order?: number
    collapsed?: number
  }) => {
    const db = getDb()
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    db.prepare(`UPDATE groups SET ${fields} WHERE id = @id`).run({ ...data, id })
    return db.prepare('SELECT * FROM groups WHERE id = ?').get(id)
  })

  ipcMain.handle('groups:delete', (_e, id: number) => {
    const db = getDb()
    db.prepare('DELETE FROM groups WHERE id = ?').run(id)
    return { success: true }
  })

  // ── Settings ─────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', (_e, key: string) => {
    const db = getDb()
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row ? row.value : null
  })

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    const db = getDb()
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
    return { success: true }
  })
}
