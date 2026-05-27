import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Filter, CheckSquare, Square, Play, Edit3,
  RefreshCw, CheckCircle, SkipForward, RotateCcw,
  ChevronLeft, ChevronRight, ArrowUpDown, Zap
} from 'lucide-react'
import api from '../api'
import TagEditor from '../components/TagEditor'
import { usePlayer } from '../hooks/usePlayer'

const STATUS_OPTIONS = ['', 'unmatched', 'matched', 'applied', 'skipped', 'error']
const SORT_OPTIONS = [
  { value: 'filename', label: 'Filename' },
  { value: 'updated_at', label: 'Updated' },
  { value: 'mb_status', label: 'Status' },
  { value: 'duration', label: 'Duration' },
]
const PAGE_SIZES = [25, 50, 100, 250]

function MBBadge({ status }) {
  return <span className={`badge badge-${status || 'unmatched'}`}>{status || 'unmatched'}</span>
}

function fmtDuration(secs) {
  if (!secs) return ''
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtSize(bytes) {
  if (!bytes) return ''
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
  return `${(bytes / 1e3).toFixed(0)} KB`
}

export default function FileManager() {
  const { playTrack } = usePlayer()
  const [data, setData] = useState({ total: 0, items: [], pages: 1, page: 1 })
  const [params, setParams] = useState({
    page: 1, page_size: 50, sort_by: 'filename', sort_dir: 'asc',
    search: '', mb_status: '', source_id: '',
  })
  const [sources, setSources] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [editFileId, setEditFileId] = useState(null)
  const [batchLoading, setBatchLoading] = useState(false)
  const searchRef = useRef()
  const searchTimer = useRef()

  const load = useCallback(async (p = params) => {
    setLoading(true)
    try {
      const res = await api.getFiles(p)
      setData(res)
      setSelected(new Set())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    api.getSources().then(setSources)
    load()
  }, [])

  const update = (patch) => {
    const next = { ...params, ...patch, page: patch.page ?? 1 }
    setParams(next)
    load(next)
  }

  const handleSearch = (val) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => update({ search: val }), 350)
  }

  const toggleSelect = (id) => {
    setSelected(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === data.items.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(data.items.map(f => f.id)))
    }
  }

  const handleBatch = async (action) => {
    if (selected.size === 0) return
    setBatchLoading(true)
    try {
      const res = await api.batchAction([...selected], action)
      alert(`Done: ${res.success} succeeded, ${res.failed} failed`)
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setBatchLoading(false)
    }
  }

  const handlePlay = (f) => {
    playTrack({
      id: f.id,
      filename: f.filename,
      streamUrl: `/api/files/${f.id}/stream`,
      bitrate: null,
      tags: {
        title: f.current_title,
        artist: f.current_artist,
        album: f.current_album,
      },
    })
  }

  const allSelected = data.items.length > 0 && selected.size === data.items.length
  const someSelected = selected.size > 0

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-700 space-y-3 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              placeholder="Search filename, title, artist, album…"
              className="input pl-9"
              onChange={e => handleSearch(e.target.value)}
            />
          </div>

          {/* Source filter */}
          <select
            value={params.source_id}
            onChange={e => update({ source_id: e.target.value })}
            className="input w-auto text-sm"
          >
            <option value="">All Sources</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Status filter */}
          <select
            value={params.mb_status}
            onChange={e => update({ mb_status: e.target.value })}
            className="input w-auto text-sm"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Page size */}
          <select
            value={params.page_size}
            onChange={e => update({ page_size: Number(e.target.value) })}
            className="input w-20 text-sm"
          >
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <button onClick={() => load()} className="btn-ghost" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Batch actions (visible when selection active) */}
        {someSelected && (
          <div className="flex items-center gap-2 bg-brand-900/30 border border-brand-800 rounded-lg px-3 py-2">
            <span className="text-sm text-brand-300 font-medium">{selected.size} selected</span>
            <div className="flex gap-2 ml-2">
              <button
                onClick={() => handleBatch('apply')}
                disabled={batchLoading}
                className="btn-primary text-xs flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3" /> Apply All
              </button>
              <button
                onClick={() => handleBatch('skip')}
                disabled={batchLoading}
                className="btn-secondary text-xs flex items-center gap-1"
              >
                <SkipForward className="w-3 h-3" /> Skip All
              </button>
              <button
                onClick={() => handleBatch('reset_mb')}
                disabled={batchLoading}
                className="btn-ghost text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset MB
              </button>
            </div>
            {batchLoading && <RefreshCw className="w-4 h-4 animate-spin text-brand-400 ml-2" />}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-800 border-b border-gray-700 z-10">
            <tr>
              <th className="w-10 px-4 py-3">
                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-brand-400" />
                    : <Square className="w-4 h-4" />
                  }
                </button>
              </th>
              {[
                { label: 'Filename', key: 'filename' },
                { label: 'Title / Artist', key: null },
                { label: 'Proposed', key: null },
                { label: 'Status', key: 'mb_status' },
                { label: 'Duration', key: 'duration' },
                { label: 'Size', key: null },
              ].map(col => (
                <th
                  key={col.label}
                  className={`text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider
                    ${col.key ? 'cursor-pointer hover:text-white' : ''}`}
                  onClick={() => col.key && update({
                    sort_by: col.key,
                    sort_dir: params.sort_by === col.key && params.sort_dir === 'asc' ? 'desc' : 'asc',
                    page: 1,
                  })}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.key && params.sort_by === col.key && (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
              <th className="w-20 px-3 py-3 text-xs text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data.items.length ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading…
                </td>
              </tr>
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-gray-500">
                  No files found. Scan a source to populate your library.
                </td>
              </tr>
            ) : data.items.map(f => (
              <tr
                key={f.id}
                className={`border-b border-gray-700/50 hover:bg-gray-800/50 transition-colors
                  ${selected.has(f.id) ? 'bg-brand-900/20' : ''}`}
                onDoubleClick={() => setEditFileId(f.id)}
              >
                <td className="px-4 py-2.5">
                  <button onClick={() => toggleSelect(f.id)} className="text-gray-400 hover:text-white">
                    {selected.has(f.id)
                      ? <CheckSquare className="w-4 h-4 text-brand-400" />
                      : <Square className="w-4 h-4" />
                    }
                  </button>
                </td>

                {/* Filename */}
                <td className="px-3 py-2.5 max-w-xs">
                  <p className="text-gray-200 truncate text-xs font-mono" title={f.path}>
                    {f.filename}
                  </p>
                  <p className="text-gray-600 text-xs truncate">{f.path.split('/').slice(0, -1).join('/')}</p>
                </td>

                {/* Current tags */}
                <td className="px-3 py-2.5 max-w-xs">
                  <p className="text-gray-200 text-xs truncate">{f.current_title || <span className="text-gray-600 italic">no title</span>}</p>
                  <p className="text-gray-400 text-xs truncate">{f.current_artist || ''}</p>
                </td>

                {/* Proposed tags */}
                <td className="px-3 py-2.5 max-w-xs">
                  {f.proposed_title ? (
                    <>
                      <p className="text-green-300 text-xs truncate">{f.proposed_title}</p>
                      <p className="text-xs text-gray-500">
                        {f.proposed_confidence
                          ? `${Math.round(f.proposed_confidence * 100)}% confidence`
                          : ''}
                      </p>
                    </>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-3 py-2.5"><MBBadge status={f.mb_status} /></td>

                {/* Duration */}
                <td className="px-3 py-2.5 text-xs text-gray-400">{fmtDuration(f.duration)}</td>

                {/* Size */}
                <td className="px-3 py-2.5 text-xs text-gray-500">{fmtSize(f.size)}</td>

                {/* Actions */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePlay(f)}
                      title="Play"
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditFileId(f.id)}
                      title="Edit tags"
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {f.mb_status === 'matched' && (
                      <button
                        onClick={async () => {
                          await api.applyTags(f.id)
                          load()
                        }}
                        title="Apply proposed tags"
                        className="p-1.5 rounded hover:bg-gray-700 text-green-400 hover:text-green-300 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700 flex-shrink-0">
        <p className="text-sm text-gray-400">
          {data.total.toLocaleString()} files · Page {data.page} of {data.pages}
          {loading && <RefreshCw className="inline w-3 h-3 animate-spin ml-2" />}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => update({ page: params.page - 1 })}
            disabled={params.page <= 1}
            className="btn-secondary flex items-center gap-1 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          {/* Page numbers */}
          {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
            let p
            if (data.pages <= 5) p = i + 1
            else if (params.page <= 3) p = i + 1
            else if (params.page >= data.pages - 2) p = data.pages - 4 + i
            else p = params.page - 2 + i
            return (
              <button
                key={p}
                onClick={() => update({ page: p })}
                className={`btn-secondary w-9 justify-center
                  ${params.page === p ? 'bg-brand-700 text-white border-brand-600' : ''}`}
              >
                {p}
              </button>
            )
          })}
          <button
            onClick={() => update({ page: params.page + 1 })}
            disabled={params.page >= data.pages}
            className="btn-secondary flex items-center gap-1 disabled:opacity-40"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tag editor modal */}
      {editFileId && (
        <TagEditor
          fileId={editFileId}
          onClose={() => setEditFileId(null)}
          onApplied={load}
        />
      )}
    </div>
  )
}
