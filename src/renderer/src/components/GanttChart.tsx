import React, { useRef, useEffect, useMemo } from 'react'
import { Group, GanttEvent } from '../types'

interface Props {
  groups: Group[]
  events: GanttEvent[]
  currentDate: string // first day of the visible month, YYYY-MM-DD
  onEditEvent: (event: GanttEvent) => void
}

const DAY_WIDTH = 28
const ROW_HEIGHT = 36
const HEADER_HEIGHT = 56 // month label + day numbers
const GROUP_HEADER_HEIGHT = 36

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function parseDate(str: string): Date {
  return new Date(str + 'T00:00:00')
}

function dateToStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

type RowItem =
  | { type: 'group-header'; group: Group }
  | { type: 'event'; event: GanttEvent }
  | { type: 'ungrouped-header' }

export default function GanttChart({ groups, events, currentDate, onEditEvent }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const viewDate = parseDate(currentDate)
  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth() // 0-indexed

  // Build months to show: previous month partial + current + next month partial
  // For simplicity show 3 months centered on current
  const months: Array<{ year: number; month: number; days: number }> = useMemo(() => {
    const result = []
    for (let offset = -1; offset <= 2; offset++) {
      let m = viewMonth + offset
      let y = viewYear
      if (m < 0) { m += 12; y -= 1 }
      if (m > 11) { m -= 12; y += 1 }
      result.push({ year: y, month: m, days: getDaysInMonth(y, m) })
    }
    return result
  }, [viewYear, viewMonth])

  const totalDays = months.reduce((s, m) => s + m.days, 0)
  const totalWidth = totalDays * DAY_WIDTH

  // Day offset from left edge for a given date string
  const dayOffset = useMemo(() => {
    const startDate = new Date(months[0].year, months[0].month, 1)
    return (dateStr: string): number => {
      const d = parseDate(dateStr)
      const diff = Math.round((d.getTime() - startDate.getTime()) / 86400000)
      return diff * DAY_WIDTH
    }
  }, [months])

  // Today's position
  const todayStr = dateToStr(new Date())
  const todayOffset = dayOffset(todayStr)
  const todayInView = todayOffset >= 0 && todayOffset <= totalWidth

  // Build rows
  const rows: RowItem[] = useMemo(() => {
    const result: RowItem[] = []
    const ungrouped = events.filter(e => e.group_id === null).sort((a, b) => a.sort_order - b.sort_order)

    result.push({ type: 'ungrouped-header' })
    ungrouped.forEach(ev => result.push({ type: 'event', event: ev }))

    const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order)
    for (const g of sortedGroups) {
      result.push({ type: 'group-header', group: g })
      if (g.collapsed === 0) {
        const groupEvents = events.filter(e => e.group_id === g.id).sort((a, b) => a.sort_order - b.sort_order)
        groupEvents.forEach(ev => result.push({ type: 'event', event: ev }))
      }
    }
    return result
  }, [groups, events])

  const totalHeight = HEADER_HEIGHT + rows.reduce((h, row) => {
    if (row.type === 'group-header' || row.type === 'ungrouped-header') return h + GROUP_HEADER_HEIGHT
    return h + ROW_HEIGHT
  }, 0)

  // Scroll to current month on mount / date change
  useEffect(() => {
    if (scrollRef.current) {
      // scroll so current month starts at ~left
      const prevDays = months[0].days // first month is previous
      scrollRef.current.scrollLeft = prevDays * DAY_WIDTH - 20
    }
  }, [currentDate, months])

  // Render day headers
  const renderHeaders = () => {
    const cells: React.ReactNode[] = []
    let dayIndex = 0

    for (const { year, month, days } of months) {
      const monthLabel = `${year}年${month + 1}月`
      const x = dayIndex * DAY_WIDTH
      cells.push(
        <div
          key={`month-${year}-${month}`}
          className="gantt-month-label"
          style={{ left: x, width: days * DAY_WIDTH }}
        >
          {monthLabel}
        </div>
      )
      for (let d = 1; d <= days; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const dayDate = new Date(year, month, d)
        const dow = dayDate.getDay()
        const isWeekend = dow === 0 || dow === 6
        const isToday = dateStr === todayStr
        cells.push(
          <div
            key={`day-${dateStr}`}
            className={`gantt-day-header${isWeekend ? ' weekend' : ''}${isToday ? ' today-header' : ''}`}
            style={{ left: (dayIndex + d - 1) * DAY_WIDTH, width: DAY_WIDTH }}
          >
            {d}
          </div>
        )
      }
      dayIndex += days
    }
    return cells
  }

  // Render grid background stripes + weekend shading + today line
  const renderGrid = () => {
    const cells: React.ReactNode[] = []
    let dayIndex = 0

    for (const { year, month, days } of months) {
      for (let d = 1; d <= days; d++) {
        const dow = new Date(year, month, d).getDay()
        const isWeekend = dow === 0 || dow === 6
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const isToday = dateStr === todayStr
        if (isWeekend || isToday) {
          cells.push(
            <div
              key={`grid-${dateStr}`}
              className={`gantt-grid-col${isWeekend ? ' weekend-col' : ''}${isToday ? ' today-col' : ''}`}
              style={{ left: dayIndex * DAY_WIDTH, width: DAY_WIDTH, height: totalHeight }}
            />
          )
        }
        dayIndex++
      }
    }

    // Today vertical marker line
    if (todayInView) {
      cells.push(
        <div
          key="today-line"
          className="today-line"
          style={{ left: todayOffset + DAY_WIDTH / 2, height: totalHeight }}
        />
      )
    }

    return cells
  }

  // Render event bars
  const renderBars = () => {
    const bars: React.ReactNode[] = []
    let y = HEADER_HEIGHT

    for (const row of rows) {
      if (row.type === 'ungrouped-header') {
        y += GROUP_HEADER_HEIGHT
        continue
      }
      if (row.type === 'group-header') {
        y += GROUP_HEADER_HEIGHT
        continue
      }
      const ev = row.event
      const barColor = ev.color || getGroupColor(ev.group_id, groups) || '#4a90d9'
      const left = dayOffset(ev.start_date)
      const right = dayOffset(ev.end_date) + DAY_WIDTH
      const width = Math.max(right - left, DAY_WIDTH)
      const barY = y + (ROW_HEIGHT - 24) / 2

      bars.push(
        <div
          key={`bar-${ev.id}`}
          className="gantt-bar"
          style={{
            left,
            top: barY,
            width,
            background: barColor
          }}
          title={`${ev.name}\n${ev.start_date} → ${ev.end_date}\n進度: ${ev.progress}%`}
          onDoubleClick={() => onEditEvent(ev)}
        >
          <div
            className="gantt-bar-progress"
            style={{ width: `${ev.progress}%`, background: darken(barColor) }}
          />
          <span className="gantt-bar-label">{ev.name}</span>
        </div>
      )
      y += ROW_HEIGHT
    }
    return bars
  }

  // Render row backgrounds (for alternating, group headers)
  const renderRowBgs = () => {
    const bgs: React.ReactNode[] = []
    let y = HEADER_HEIGHT
    let rowIdx = 0

    for (const row of rows) {
      if (row.type === 'ungrouped-header') {
        bgs.push(
          <div key={`rbg-${rowIdx}`} className="gantt-group-header-row" style={{ top: y, height: GROUP_HEADER_HEIGHT, width: totalWidth }}>
            <span style={{ paddingLeft: 8, fontSize: 12, color: '#888' }}>未分組</span>
          </div>
        )
        y += GROUP_HEADER_HEIGHT
      } else if (row.type === 'group-header') {
        bgs.push(
          <div
            key={`rbg-${rowIdx}`}
            className="gantt-group-header-row"
            style={{ top: y, height: GROUP_HEADER_HEIGHT, width: totalWidth, borderLeft: `4px solid ${row.group.color}` }}
          >
            <span style={{ paddingLeft: 8, fontSize: 12, color: '#ccc' }}>{row.group.name}</span>
          </div>
        )
        y += GROUP_HEADER_HEIGHT
      } else {
        bgs.push(
          <div
            key={`rbg-${rowIdx}`}
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

  return (
    <div className="gantt-scroll-wrapper" ref={scrollRef}>
      <div className="gantt-inner" style={{ width: totalWidth, height: totalHeight }}>
        {/* sticky header area */}
        <div className="gantt-header" style={{ width: totalWidth }}>
          {renderHeaders()}
        </div>
        {/* grid background */}
        <div className="gantt-grid">
          {renderGrid()}
          {renderRowBgs()}
          {renderBars()}
        </div>
      </div>
    </div>
  )
}

function getGroupColor(groupId: number | null, groups: Group[]): string | null {
  if (groupId === null) return null
  const g = groups.find(g => g.id === groupId)
  return g ? g.color : null
}

function darken(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`
  } catch {
    return hex
  }
}
