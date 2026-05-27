import { useState, useEffect } from 'react'
import {
  Plus, Trash2, TestTube, Play, FolderOpen, Folder,
  ChevronRight, X, Check, RefreshCw, Globe, CloudOff
} from 'lucide-react'
import api from '../api'

function FolderBrowser({ sourceId, selectedPaths, onToggle, onClose }) {
  const [path, setPath] = useState('/')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [stack, setStack] = useState(['/'])

  const browse = async (p) => {
    setLoading(true)
    try {
      const res = await api.browseSource(sourceId, p)
      setEntries(res.entries.filter(e => e.is_dir))
      setPath(p)
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { browse('/') }, [])

  const navigate = (entry) => {
    setStack(s => [...s, entry.path])
    browse(entry.path)
  }

  const goBack = () => {
    if (stack.length <= 1) return
    const prev = stack[stack.length - 2]
    setStack(s => s.slice(0, -1))
    browse(prev)
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="font-semibold text-white">Select Folders to Scan</h3>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-4 h-4" /></button>
        </div>

        {/* Breadcrumb */}
        <div className="px-4 py-2 border-b border-gray-700 flex items-center gap-1 text-xs text-gray-400 flex-wrap">
          {stack.map((p, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3" />}
              <button
                onClick={() => {
                  setStack(s => s.slice(0, i + 1))
                  browse(p)
                }}
                className="hover:text-white"
              >
                {p === '/' ? 'Root' : p.split('/').filter(Boolean).pop()}
              </button>
            </span>
          ))}
        </div>

        <div className="h-72 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="animate-spin w-5 h-5 text-gray-400" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">No subdirectories found</p>
          ) : (
            <div className="space-y-1">
              {stack.length > 1 && (
                <button
                  onClick={goBack}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-800 text-gray-400 text-sm"
                >
                  <Folder className="w-4 h-4" /> ..
                </button>
              )}
              {entries.map(e => {
                const isSelected = selectedPaths.includes(e.path)
                return (
                  <div key={e.path} className="flex items-center gap-2">
                    <button
                      onClick={() => onToggle(e.path)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded text-sm text-left
                        ${isSelected ? 'bg-brand-900/40 text-brand-300' : 'hover:bg-gray-800 text-gray-300'}`}
                    >
                      {isSelected
                        ? <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        : <Folder className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      }
                      {e.name}
                    </button>
                    <button
                      onClick={() => navigate(e)}
                      className="p-2 hover:bg-gray-800 rounded text-gray-500 hover:text-gray-300"
                      title="Browse inside"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-between items-center">
          <p className="text-xs text-gray-400">
            {selectedPaths.length} folder{selectedPaths.length !== 1 ? 's' : ''} selected
          </p>
          <button onClick={onClose} className="btn-primary">Done</button>
        </div>
      </div>
    </div>
  )
}

const PROVIDER_FIELDS = {
  nextcloud: [
    { key: 'url', label: 'Nextcloud URL', placeholder: 'https://nextcloud.example.com', type: 'url' },
    { key: 'username', label: 'Username', placeholder: 'your_username' },
    { key: 'password', label: 'App Password', placeholder: 'xxxx-xxxx-xxxx-xxxx', type: 'password' },
    { key: 'verify_ssl', label: 'Verify SSL', type: 'checkbox' },
  ],
  s3: [
    { key: 'bucket', label: 'Bucket name' },
    { key: 'region', label: 'Region', placeholder: 'us-east-1' },
    { key: 'access_key', label: 'Access Key ID' },
    { key: 'secret_key', label: 'Secret Access Key', type: 'password' },
    { key: 'prefix', label: 'Prefix (optional)', placeholder: 'music/' },
  ],
}

function SourceForm({ existing, onSave, onCancel }) {
  const [name, setName] = useState(existing?.name || '')
  const [type, setType] = useState(existing?.provider_type || 'nextcloud')
  const [config, setConfig] = useState(existing?.config || { verify_ssl: true })
  const [scanPaths, setScanPaths] = useState(existing?.scan_paths || [])
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showBrowser, setShowBrowser] = useState(false)
  const [tempSourceId, setTempSourceId] = useState(existing?.id || null)

  const handleTest = async () => {
    if (!tempSourceId) {
      alert('Save the source first, then test the connection.')
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.testSource(tempSourceId)
      setTestResult(res)
    } catch (e) {
      setTestResult({ success: false, message: e.message })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return alert('Name is required')
    setSaving(true)
    try {
      let src
      if (existing) {
        src = await api.updateSource(existing.id, { name, config, scan_paths: scanPaths })
      } else {
        src = await api.createSource({ name, provider_type: type, config, scan_paths: scanPaths })
        setTempSourceId(src.id)
      }
      onSave(src)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const fields = PROVIDER_FIELDS[type] || []

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold text-white">{existing ? 'Edit Source' : 'New Source'}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="My Nextcloud" />
        </div>
        {!existing && (
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Provider</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input">
              <option value="nextcloud">Nextcloud (WebDAV)</option>
              <option value="s3">Amazon S3 (coming soon)</option>
              <option value="onedrive">OneDrive (coming soon)</option>
              <option value="googledrive">Google Drive (coming soon)</option>
            </select>
          </div>
        )}
      </div>

      {/* Provider config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key} className={f.type === 'checkbox' ? 'flex items-center gap-2' : ''}>
            {f.type === 'checkbox' ? (
              <>
                <input
                  type="checkbox"
                  id={f.key}
                  checked={!!config[f.key]}
                  onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.checked }))}
                  className="w-4 h-4 accent-brand-500"
                />
                <label htmlFor={f.key} className="text-sm text-gray-300">{f.label}</label>
              </>
            ) : (
              <>
                <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={config[f.key] || ''}
                  onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="input"
                />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Scan paths */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400 font-medium">Scan Folders</label>
          <button
            onClick={() => setShowBrowser(true)}
            disabled={!tempSourceId}
            className="btn-ghost text-xs flex items-center gap-1"
            title={!tempSourceId ? 'Save first to browse folders' : ''}
          >
            <FolderOpen className="w-3.5 h-3.5" /> Browse
          </button>
        </div>
        {scanPaths.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No folders selected — entire storage will be scanned</p>
        ) : (
          <div className="space-y-1">
            {scanPaths.map(p => (
              <div key={p} className="flex items-center gap-2 bg-gray-700 rounded px-3 py-1.5 text-xs text-gray-300">
                <Folder className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="flex-1 truncate font-mono">{p}</span>
                <button onClick={() => setScanPaths(ps => ps.filter(x => x !== p))}
                  className="text-gray-500 hover:text-red-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`text-sm rounded p-3 flex items-center gap-2
          ${testResult.success ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
          {testResult.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {testResult.message}
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-2">
          {tempSourceId && (
            <button onClick={handleTest} disabled={testing} className="btn-secondary flex items-center gap-1.5">
              <TestTube className={`w-3.5 h-3.5 ${testing ? 'animate-pulse' : ''}`} />
              {testing ? 'Testing…' : 'Test'}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {showBrowser && tempSourceId && (
        <FolderBrowser
          sourceId={tempSourceId}
          selectedPaths={scanPaths}
          onToggle={p => setScanPaths(ps =>
            ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p]
          )}
          onClose={() => {
            setShowBrowser(false)
            // Save paths
            api.updateSource(tempSourceId, { scan_paths: scanPaths })
          }}
        />
      )}
    </div>
  )
}

export default function Sources() {
  const [sources, setSources] = useState([])
  const [editing, setEditing] = useState(null)  // null | 'new' | source object
  const [scanning, setScanning] = useState({})

  useEffect(() => {
    api.getSources().then(setSources)
  }, [])

  const handleScan = async (id) => {
    setScanning(s => ({ ...s, [id]: true }))
    try {
      await api.scanSource(id)
      alert('Scan started!')
    } catch (e) {
      alert(e.message)
    } finally {
      setScanning(s => ({ ...s, [id]: false }))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this source and all its file records?')) return
    await api.deleteSource(id)
    setSources(s => s.filter(x => x.id !== id))
  }

  const reload = () => api.getSources().then(setSources)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Storage Sources</h1>
          <p className="text-gray-400 text-sm mt-1">Connect your cloud music libraries</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing('new')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Source
          </button>
        )}
      </div>

      {editing === 'new' && (
        <SourceForm
          onSave={() => { reload(); setEditing(null) }}
          onCancel={() => setEditing(null)}
        />
      )}

      {sources.length === 0 && !editing ? (
        <div className="card p-12 text-center">
          <Globe className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">No storage sources yet</p>
          <button onClick={() => setEditing('new')} className="btn-primary">
            <Plus className="w-4 h-4 inline mr-1" /> Add Nextcloud
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map(s => (
            editing?.id === s.id ? (
              <SourceForm
                key={s.id}
                existing={s}
                onSave={() => { reload(); setEditing(null) }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div key={s.id} className="card p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                  ${s.is_active ? 'bg-brand-900/50 text-brand-400' : 'bg-gray-700 text-gray-500'}`}>
                  {s.is_active ? <Globe className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{s.name}</h3>
                    <span className="badge badge-skipped text-xs">{s.provider_type}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.file_count?.toLocaleString()} files
                    {s.scan_paths?.length > 0
                      ? ` · ${s.scan_paths.length} folder${s.scan_paths.length > 1 ? 's' : ''} configured`
                      : ' · full storage'}
                    {s.last_scan_at
                      ? ` · last scanned ${new Date(s.last_scan_at).toLocaleDateString()}`
                      : ' · never scanned'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleScan(s.id)} disabled={scanning[s.id]}
                    className="btn-secondary text-xs flex items-center gap-1">
                    <Play className={`w-3 h-3 ${scanning[s.id] ? 'animate-pulse' : ''}`} />
                    {scanning[s.id] ? 'Starting…' : 'Scan'}
                  </button>
                  <button onClick={() => setEditing(s)} className="btn-ghost text-xs">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="btn-ghost text-xs text-red-400 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}
