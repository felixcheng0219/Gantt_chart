import React, { useState, useEffect } from 'react'
import { Group } from '../types'

interface Props {
  group?: Group | null
  onSave: (data: { name: string; color: string }) => void
  onCancel: () => void
}

const PRESET_COLORS = [
  '#4a90d9', '#e74c3c', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#3498db',
  '#e91e63', '#00bcd4', '#8bc34a', '#ff5722'
]

export default function GroupForm({ group, onSave, onCancel }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#4a90d9')

  useEffect(() => {
    if (group) {
      setName(group.name)
      setColor(group.color)
    }
  }, [group])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({ name: name.trim(), color })
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{group ? '編輯群組' : '新增群組'}</h2>
          <button className="btn-icon" onClick={onCancel}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="form">
          <div className="form-field">
            <label>名稱</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="群組名稱"
              autoFocus
            />
          </div>
          <div className="form-field">
            <label>顏色</label>
            <div className="color-picker-row">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="color-input"
              />
              <div className="color-presets">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`color-preset${color === c ? ' selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>取消</button>
            <button type="submit" className="btn btn-primary">儲存</button>
          </div>
        </form>
      </div>
    </div>
  )
}
