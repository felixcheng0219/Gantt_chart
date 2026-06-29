import React, { useRef, useEffect, useMemo, useState } from 'react'
import { Group, GanttEvent, ViewMode } from '../types'

interface Props {
  groups: Group[]
  events: GanttEvent[]
  currentDate: string
  viewMode: ViewMode
  onEditEvent: (event: GanttEvent) => void
  onUpdateEvent: (id: number, data: Partial<GanttEvent>) => Promise<void>
}

const ROW_HEIGHT = 36
const HEADER_HEIGHT = 56
const GROUP_HEADER_HEIGHT = 36
const HANDLE_WIDTH = 8

const PX_PER_DAY: Record<ViewMode, number> = {
  day:     48,
  week:    20,
  month:   8,
  quarter: 3,
  year:    1,
}

// Days before/after currentDate to render in the scrollable canvas
const RANGE: Record<ViewMode, { before: number; after: number }> = {
  day:     { before: 30,  after: 90  },
  week:    { before: 60,  after: 180 },
  month:   { before: 90,  after: 360 },
  quarter: { before: 180, after: 545 },
  year:    { before: 365, after: 730 },
}

// ── date helpers (all use local time, no UTC conversion) ──────────────────────

function parseDate(str: string): Date {
  return new Date(str + 'T00:00:00')
}

function dateToStr(d: Date): string {
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, '0')}-` +
    `${String(d.getDate()).padStart(2, '0')}`
  )
}

function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + days)
  return dateToStr(d)
}

function diffDays(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
}

function computeRangeStart(currentDate: string, viewMode: ViewMode): string {
  const { before } = RANGE[viewMode]
  const d = parseDate(currentDate)
  d.setDate(d.getDate() - before)
  d.setDate(1) // align to month start
  return dateToStr(d)
}

function computeTotalDays(rangeStart: string, currentDate: string, viewMode: ViewMode): number {
  const { after } = RANGE[viewMode]
  const endDate = addDays(currentDate, after)
  return diffDays(rangeStart, endDate) + 1
}

// ── header grouping ───────────────────────────────────────────────────────────

type HeaderGroup = { key: string; label: string; startIdx: number; count: number }
type HeaderUnit = 'day' | 'week' | 'month' | 'quarter' | 'year'

const DOW_ZH = ['日', '一', '二', '三', '四', '五', '六']

function groupByUnit(rangeStart: string, totalDays: number, unit: HeaderUnit): HeaderGroup[] {
  const groups: HeaderGroup[] = []

  for (let i = 0; i < totalDays; i++) {
    const d = parseDate(addDays(rangeStart, i))
    const y = d.getFullYear()
    const m = d.getMonth()
    const day = d.getDate()
    const dow = d.getDay()

    let key: string
    let label: string

    if (unit === 'day') {
      key = addDays(rangeStart, i)
      label = String(day)
    } else if (unit === 'week') {
      // Week key = Monday of this week
      const daysToMon = dow === 0 ? 6 : dow - 1
      const mon = new Date(d)
      mon.setDate(day - daysToMon)
      key = dateToStr(mon)
      label = `${mon.getMonth() + 1}/${mon.getDate()}`
    } else if (unit === 'month') {
      key = `${y}-${m}`
      label = `${m + 1}月`
    } else if (unit === 'quarter') {
      const q = Math.floor(m / 3) + 1
      key = `${y}-Q${q}`
      label = `Q${q}`
    } else {
      key = `${y}`
      label = `${y}`
    }

    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.count++
    } else {
      groups.push({ key, label, startIdx: i, count: 1 })
    }
  }

  return groups
}

// ── drag types ────────────────────────────────────────────────────────────────

type DragMode = 'move' | 'resize-left' | 'resize-right'

type DragState = {
  mode: DragMode
  eventId: number
  originalStart: string
  originalEnd: string
  startX: number
  currentStart: string
  currentEnd: string
}

type DraggingBar = { eventId: number; start: string; end: string }
type DragTooltip = { x: number; y: number; text: string }

// ── row model ────────────────────────────────────────────────────────────────

type RowItem =
  | { type: 'ungrouped-header' }
  | { type: 'group-header'; group: Group }
  | { type: 'event'; event: GanttEvent }

function buildRows(groups: Group[], events: GanttEvent[]): RowItem[] {
  const rows: RowItem[] = []

  const ungrouped = events
    .filter(e => e.group_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)

  rows.push({ type: 'ungrouped-header' })
  ungrouped.forEach(ev => rows.push({ type: 'event', event: ev }))

  const sorted = [...groups].sort((a, b) => a.sort_order - b.sort_order)
  for (const g of sorted) {
    rows.push({ type: 'group-header', group: g })
    if (g.collapsed === 0) {
      events
        .filter(e => e.group_id === g.id)
        .sort((a, b) => a.sort_order - b.sort_order)
        .forEach(ev => rows.push({ type: 'event', event: ev }))
    }
  }

  return rows
}

// ── colour helpers ───────────────────────────────────────────────────────────

function getGroupColor(groupId: number | null, groups: Group[]): string | null {
  if (groupId === null) return null
  return groups.find(g => g.id === groupId)?.color ?? null
}

function darken(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${Math.max(0, r - 40)},${Math.max(0, g - 40)},${Math.max(0, b - 40)})`
  } catch {
    return hex
  }
}

// ── component ────────────────────────────────────────────────────────────────

export default function GanttChart({
  groups, events, currentDate, viewMode, onEditEvent, onUpdateEvent,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const pxPerDayRef = useRef(PX_PER_DAY[viewMode])

  const [draggingBar, setDraggingBar] = useState<DraggingBar | null>(null)
  const [dragTooltip, setDragTooltip] = useState<DragTooltip | null>(null)

  const pxPerDay = PX_PER_DAY[viewMode]

  useEffect(() => { pxPerDayRef.current = pxPerDay }, [pxPerDay])

  // ── range ──
  const rangeStart = useMemo(
    () => computeRangeStart(currentDate, viewMode),
    [currentDate, viewMode],
  )
  const totalDays = useMemo(
    () => computeTotalDays(rangeStart, currentDate, viewMode),
    [rangeStart, currentDate, viewMode],
  )
  const totalWidth = totalDays * pxPerDay

  const dayOffset = (dateStr: string) => diffDays(rangeStart, dateStr) * pxPerDay

  // ── today ──
  const todayStr = dateToStr(new Date())
  const todayOffset = dayOffset(todayStr)
  const todayInView = todayOffset >= 0 && todayOffset <= totalWidth

  // ── rows ──
  const rows = useMemo(() => buildRows(groups, events), [groups, events])

  const totalHeight = HEADER_HEIGHT + rows.reduce((h, row) =>
    h + (row.type === 'event' ? ROW_HEIGHT : GROUP_HEADER_HEIGHT), 0)

  // ── scroll to currentDate on mount / date or view change ──
  useEffect(() => {
    if (scrollRef.current) {
      const offset = dayOffset(currentDate)
      scrollRef.current.scrollLeft = Math.max(0, offset - 120)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode])

  // ── drag: document-level listeners ──
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const { mode, eventId, originalStart, originalEnd, startX } = dragRef.current
      const deltaDays = Math.round((e.clientX - startX) / pxPerDayRef.current)

      let newStart = originalStart
      let newEnd = originalEnd

      if (mode === 'move') {
        newStart = addDays(originalStart, deltaDays)
        newEnd = addDays(originalEnd, deltaDays)
      } else if (mode === 'resize-left') {
        newStart = addDays(originalStart, deltaDays)
        if (newStart >= newEnd) newStart = addDays(newEnd, -1)
      } else {
        newEnd = addDays(originalEnd, deltaDays)
        if (newEnd <= newStart) newEnd = addDays(newStart, 1)
      }

      dragRef.current.currentStart = newStart
      dragRef.current.currentEnd = newEnd
      setDraggingBar({ eventId, start: newStart, end: newEnd })
      setDragTooltip({ x: e.clientX + 14, y: e.clientY - 38, text: `${newStart} → ${newEnd}` })
    }

    const onMouseUp = async () => {
      if (!dragRef.current) return
      const { eventId, currentStart, currentEnd, originalStart, originalEnd } = dragRef.current
      dragRef.current = null
      setDraggingBar(null)
      setDragTooltip(null)

      // Only save if actually moved
      if (currentStart !== originalStart || currentEnd !== originalEnd) {
        await onUpdateEvent(eventId, {
          start_date: currentStart,
          end_date: currentEnd,
          duration_days: diffDays(currentStart, currentEnd) + 1,
        })
      }
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [onUpdateEvent])

  const startDrag = (ev: GanttEvent, e: React.MouseEvent, mode: DragMode) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      mode,
      eventId: ev.id,
      originalStart: ev.start_date,
      originalEnd: ev.end_date,
      startX: e.clientX,
      currentStart: ev.start_date,
      currentEnd: ev.end_date,
    }
  }

  // ── header rendering ──
  const renderHeaders = () => {
    const cells: React.ReactNode[] = []

    // Top row
    const topUnit: HeaderUnit = (viewMode === 'day' || viewMode === 'week') ? 'month' : 'year'
    groupByUnit(rangeStart, totalDays, topUnit).forEach(({ key, label, startIdx, count }) => {
      cells.push(
        <div
          key={`top-${key}`}
          className="gantt-header-top"
          style={{ left: startIdx * pxPerDay, width: count * pxPerDay }}
        >
          {label}
        </div>
      )
    })

    // Bottom row
    const bottomUnit: HeaderUnit =
      viewMode === 'day'     ? 'day'
      : viewMode === 'week'    ? 'week'
      : viewMode === 'month'   ? 'month'
      : 'quarter' // quarter + year both show quarters on bottom

    groupByUnit(rangeStart, totalDays, bottomUnit).forEach(({ key, label, startIdx, count }) => {
      const dateStr = addDays(rangeStart, startIdx)
      const d = parseDate(dateStr)
      const dow = d.getDay()
      const isWeekend = bottomUnit === 'day' && (dow === 0 || dow === 6)
      const isToday = bottomUnit === 'day' && dateStr === todayStr
      const dowLabel = bottomUnit === 'day' ? DOW_ZH[dow] : null

      cells.push(
        <div
          key={`bot-${key}`}
          className={[
            'gantt-header-bottom',
            isWeekend ? 'weekend' : '',
            isToday   ? 'today-header' : '',
          ].filter(Boolean).join(' ')}
          style={{ left: startIdx * pxPerDay, width: count * pxPerDay }}
        >
          {dowLabel && <span className="gantt-header-dow">{dowLabel}</span>}
          <span>{label}</span>
        </div>
      )
    })

    return cells
  }

  // ── grid background (weekend + today column) ──
  const renderGrid = () => {
    const cells: React.ReactNode[] = []

    // Weekend columns only at day/week scale (at month/quarter/year they're too small)
    if (viewMode === 'day' || viewMode === 'week') {
      for (let i = 0; i < totalDays; i++) {
        const dateStr = addDays(rangeStart, i)
        const dow = parseDate(dateStr).getDay()
        if (dow === 0 || dow === 6) {
          cells.push(
            <div
              key={`wknd-${dateStr}`}
              className="gantt-grid-col weekend-col"
              style={{ left: i * pxPerDay, width: pxPerDay, height: totalHeight }}
            />
          )
        }
      }
    }

    // Today column highlight
    if (todayInView) {
      cells.push(
        <div
          key="today-col"
          className="gantt-grid-col today-col"
          style={{ left: todayOffset, width: Math.max(pxPerDay, 2), height: totalHeight }}
        />
      )
      // Today line
      cells.push(
        <div
          key="today-line"
          className="today-line"
          style={{ left: todayOffset + Math.max(pxPerDay, 2) / 2, height: totalHeight }}
        />
      )
    }

    return cells
  }

  // ── row backgrounds ──
  const renderRowBgs = () => {
    const bgs: React.ReactNode[] = []
    let y = HEADER_HEIGHT
    let rowIdx = 0

    for (const row of rows) {
      if (row.type === 'ungrouped-header') {
        bgs.push(
          <div key={`rbg-${rowIdx}`} className="gantt-group-header-row"
            style={{ top: y, height: GROUP_HEADER_HEIGHT, width: totalWidth }}>
            <span style={{ paddingLeft: 8, fontSize: 11, color: '#777' }}>未分組</span>
          </div>
        )
        y += GROUP_HEADER_HEIGHT
      } else if (row.type === 'group-header') {
        bgs.push(
          <div key={`rbg-${rowIdx}`} className="gantt-group-header-row"
            style={{ top: y, height: GROUP_HEADER_HEIGHT, width: totalWidth, borderLeft: `4px solid ${row.group.color}` }}>
            <span style={{ paddingLeft: 8, fontSize: 12, color: '#ccc' }}>{row.group.name}</span>
          </div>
        )
        y += GROUP_HEADER_HEIGHT
      } else {
        bgs.push(
          <div key={`rbg-${rowIdx}`}
            className={`gantt-row-bg${rowIdx % 2 === 0 ? '' : ' alt'}`}
            style={{ top: y, height: ROW_HEIGHT, width: totalWidth }}
          />
        )
        y += ROW_HEIGHT
      }
      rowIdx++
    }
    return bgs
  }

  // ── event bars ──
  const renderBars = () => {
    const bars: React.ReactNode[] = []
    let y = HEADER_HEIGHT

    for (const row of rows) {
      if (row.type !== 'event') {
        y += GROUP_HEADER_HEIGHT
        continue
      }

      const ev = row.event
      const isDragging = draggingBar?.eventId === ev.id
      const startDate = isDragging ? draggingBar!.start : ev.start_date
      const endDate   = isDragging ? draggingBar!.end   : ev.end_date

      const left = dayOffset(startDate)
      const right = dayOffset(endDate) + pxPerDay
      const width = Math.max(right - left, pxPerDay)
      const barColor = ev.color || getGroupColor(ev.group_id, groups) || '#4a90d9'
      const barY = y + (ROW_HEIGHT - 24) / 2

      bars.push(
        <div
          key={`bar-${ev.id}`}
          className={`gantt-bar${isDragging ? ' dragging' : ''}`}
          style={{ left, top: barY, width, background: barColor }}
          title={`${ev.name}\n${startDate} → ${endDate}\n進度: ${ev.progress}%`}
          onDoubleClick={() => !dragRef.current && onEditEvent(ev)}
          onMouseDown={e => {
            // Determine drag mode by click position within bar
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const relX = e.clientX - rect.left
            if (relX <= HANDLE_WIDTH) {
              startDrag(ev, e, 'resize-left')
            } else if (relX >= rect.width - HANDLE_WIDTH) {
              startDrag(ev, e, 'resize-right')
            } else {
              startDrag(ev, e, 'move')
            }
          }}
        >
          {/* Left resize handle */}
          <div className="gantt-bar-handle left" />
          {/* Progress overlay */}
          <div
            className="gantt-bar-progress"
            style={{ width: `${ev.progress}%`, background: darken(barColor) }}
          />
          {/* Label */}
          <span className="gantt-bar-label">{ev.name}</span>
          {/* Right resize handle */}
          <div className="gantt-bar-handle right" />
        </div>
      )

      y += ROW_HEIGHT
    }
    return bars
  }

  // ── month boundary lines (subtle vertical guides) ──
  const renderMonthLines = () => {
    if (pxPerDay < 3) return null // too small to bother
    const lines: React.ReactNode[] = []
    groupByUnit(rangeStart, totalDays, 'month').forEach(({ startIdx, key }) => {
      if (startIdx === 0) return
      lines.push(
        <div
          key={`mline-${key}`}
          className="gantt-month-line"
          style={{ left: startIdx * pxPerDay, height: totalHeight }}
        />
      )
    })
    return lines
  }

  return (
    <div className="gantt-scroll-wrapper" ref={scrollRef}>
      <div className="gantt-inner" style={{ width: totalWidth, height: totalHeight }}>
        {/* Sticky header */}
        <div className="gantt-header" style={{ width: totalWidth }}>
          {renderHeaders()}
        </div>
        {/* Grid */}
        <div className="gantt-grid">
          {renderMonthLines()}
          {renderGrid()}
          {renderRowBgs()}
          {renderBars()}
        </div>
      </div>

      {/* Drag tooltip — fixed position, outside scroll container */}
      {dragTooltip && (
        <div
          className="drag-tooltip"
          style={{ left: dragTooltip.x, top: dragTooltip.y }}
        >
          {dragTooltip.text}
        </div>
      )}
    </div>
  )
}
