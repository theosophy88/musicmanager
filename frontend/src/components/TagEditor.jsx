import { useState, useEffect } from 'react'
import { X, Save, RefreshCw, CheckCircle, SkipForward } from 'lucide-react'
import api from '../api'

const FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'album', label: 'Album' },
  { key: 'album_artist', label: 'Album Artist' },
  { key: 'year', label: 'Year' },
  { key: 'track_number', label: 'Track #' },
  { key: 'disc_number', label: 'Disc #' },
  { key: 'genre', label: 'Genre' },
  { key: 'composer', label: 'Composer' },
  { key: 'label', label: 'Label' },
  { key: 'comment', label: 'Comment', multiline: true },
]

function DiffField({ field, current, proposed, edited, onChange }) {
  const cur = current?.[field.key]
  const prop = proposed?.[field.key]
  const val = edited?.[field.key] ?? prop ?? cur ?? ''
  const changed = val !== cur

  return (
    <div className="grid grid-cols-[120px_1fr_1fr] gap-2 items-start">
      <label className="text-xs text-gray-400 pt-2 font-medium">{field.label}</label>
      {/* Current */}
      <div className="text-xs bg-gray-900 rounded px-2 py-2 text-gray-300 min-h-[32px] break-words">
        {cur || <span className="text-gray-600 italic">empty</span>}
      </div>
      {/* Editable proposed */}
      <div className="relative">
        {field.multiline ? (
          <textarea
            value={val}
            onChange={e => onChange(field.key, e.target.value)}
            className={`input text-xs resize-none h-16 ${changed ? 'border-yellow-600' : ''}`}
          />
        ) : (
          <input
            value={val}
            onChange={e => onChange(field.key, e.target.value)}
            className={`input text-xs ${changed ? 'border-yellow-600' : ''}`}
          />
        )}
        {prop && prop !== cur && (
          <button
            onClick={() => onChange(field.key, cur || '')}
            title="Restore original"
            className="absolute right-2 top-2 text-gray-500 hover:text-gray-300 text-xs"
          >↩</button>
        )}
      </div>
    </div>
  )
}

export default function TagEditor({ fileId, onClose, onApplied }) {
  const [file, setFile] = useState(null)
  const [edited, setEdited] = useState({})
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [rematching, setRematching] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!fileId) return
    api.getFile(fileId).then(f => {
      setFile(f)
      setEdited({})
    })
  }, [fileId])

  if (!fileId) return null

  const handleFieldChange = (key, value) => {
    setEdited(e => ({ ...e, [key]: value }))
  }

  const handleSaveProposed = async () => {
    setSaving(true)
    try {
      const merged = {}
      FIELDS.forEach(f => {
        const val = edited[f.key] ?? file.proposed_tags?.[f.key]
        if (val !== undefined) merged[f.key] = val
      })
      const updated = await api.updateProposed(fileId, merged)
      setFile(f => ({ ...f, proposed_tags: updated }))
      setEdited({})
      setMsg({ type: 'ok', text: 'Proposed tags saved' })
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleApply = async () => {
    // Save edits first if any
    if (Object.keys(edited).length > 0) await handleSaveProposed()
    setApplying(true)
    try {
      await api.applyTags(fileId)
      setMsg({ type: 'ok', text: 'Tags written to file!' })
      setTimeout(() => { onApplied?.(); onClose() }, 1200)
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setApplying(false)
    }
  }

  const handleRematch = async () => {
    setRematching(true)
    setMsg(null)
    try {
      const result = await api.rematchFile(fileId)
      const updated = await api.getFile(fileId)
      setFile(updated)
      setEdited({})
      setMsg({
        type: 'ok',
        text: `Rematched: ${result.mb_status} (confidence ${Math.round((result.confidence || 0) * 100)}%)`,
      })
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setRematching(false)
    }
  }

  const handleSkip = async () => {
    await api.skipFile(fileId)
    onApplied?.()
    onClose()
  }

  if (!file) return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <RefreshCw className="animate-spin w-8 h-8 text-brand-400" />
    </div>
  )

  const confidence = file.proposed_tags?.confidence
  const confColor = !confidence ? 'text-gray-500' :
    confidence >= 0.8 ? 'text-green-400' :
    confidence >= 0.5 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-700">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-white truncate">{file.filename}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`badge badge-${file.mb_status}`}>{file.mb_status}</span>
              {file.duration && (
                <span className="text-xs text-gray-500">
                  {Math.floor(file.duration / 60)}:{String(Math.round(file.duration % 60)).padStart(2, '0')}
                </span>
              )}
              {file.bitrate && <span className="text-xs text-gray-500">{file.bitrate} kbps</span>}
              {confidence !== undefined && confidence !== null && (
                <span className={`text-xs font-medium ${confColor}`}>
                  MB confidence: {Math.round(confidence * 100)}%
                </span>
              )}
              {file.proposed_tags?.mb_recording_id && (
                <a
                  href={`https://musicbrainz.org/recording/${file.proposed_tags.mb_recording_id}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs text-brand-400 hover:underline"
                >MB link ↗</a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1 ml-4 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[120px_1fr_1fr] gap-2 px-5 py-2 bg-gray-800/50 text-xs text-gray-500 font-medium">
          <div>Field</div>
          <div>Current (in file)</div>
          <div>Proposed (editable)</div>
        </div>

        {/* Fields */}
        <div className="overflow-y-auto flex-1 p-5 space-y-2">
          {FIELDS.map(f => (
            <DiffField
              key={f.key}
              field={f}
              current={file.current_tags}
              proposed={file.proposed_tags}
              edited={edited}
              onChange={handleFieldChange}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-700 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2">
            <button onClick={handleRematch} disabled={rematching} className="btn-secondary flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${rematching ? 'animate-spin' : ''}`} />
              {rematching ? 'Searching…' : 'Re-match MB'}
            </button>
            <button onClick={handleSkip} className="btn-ghost flex items-center gap-1.5 text-gray-400">
              <SkipForward className="w-3.5 h-3.5" /> Skip
            </button>
          </div>

          <div className="flex items-center gap-2">
            {msg && (
              <span className={`text-xs ${msg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                {msg.text}
              </span>
            )}
            {Object.keys(edited).length > 0 && (
              <button onClick={handleSaveProposed} disabled={saving} className="btn-secondary flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : 'Save edits'}
              </button>
            )}
            <button
              onClick={handleApply}
              disabled={applying || !file.proposed_tags}
              className="btn-primary flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {applying ? 'Writing…' : 'Apply to File'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
