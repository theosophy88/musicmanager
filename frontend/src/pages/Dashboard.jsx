import { useState, useEffect } from 'react'
import { Music, CheckCircle, AlertCircle, Clock, RefreshCw, Database, Zap } from 'lucide-react'
import api from '../api'

function StatCard({ icon: Icon, label, value, color = 'gray', sub }) {
  const colors = {
    green: 'bg-green-900/30 border-green-800 text-green-400',
    blue: 'bg-blue-900/30 border-blue-800 text-blue-400',
    yellow: 'bg-yellow-900/30 border-yellow-800 text-yellow-400',
    red: 'bg-red-900/30 border-red-800 text-red-400',
    gray: 'bg-gray-800 border-gray-700 text-gray-400',
    brand: 'bg-brand-900/30 border-brand-800 text-brand-400',
  }
  return (
    <div className={`card p-5 border ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value?.toLocaleString() ?? '—'}</p>
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [sources, setSources] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, srcs] = await Promise.all([api.getStats(), api.getSources()])
      setStats(s)
      setSources(srcs)
      // Get recent jobs for all sources
      const allJobs = []
      for (const src of srcs.slice(0, 3)) {
        const j = await api.getJobs(src.id, 5)
        allJobs.push(...j.map(job => ({ ...job, source_name: src.name })))
      }
      allJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setJobs(allJobs.slice(0, 10))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleScanAll = async () => {
    for (const src of sources) {
      await api.scanSource(src.id)
    }
    setTimeout(load, 1000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
    </div>
  )

  const matchRate = stats?.total_files
    ? Math.round(((stats.matched + stats.applied) / stats.total_files) * 100)
    : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Your music library at a glance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          {sources.length > 0 && (
            <button onClick={handleScanAll} className="btn-primary flex items-center gap-2">
              <Zap className="w-4 h-4" /> Scan All
            </button>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Music} label="Total Files" value={stats?.total_files} color="brand" />
        <StatCard icon={CheckCircle} label="Tags Applied" value={stats?.applied} color="blue"
          sub={`${matchRate}% match rate`} />
        <StatCard icon={Clock} label="Pending Review" value={stats?.matched} color="yellow" />
        <StatCard icon={AlertCircle} label="Scan Errors" value={stats?.errors} color="red" />
      </div>

      {/* Progress bar */}
      {stats?.total_files > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Library Coverage</h2>
          <div className="space-y-2">
            {[
              { label: 'Applied', val: stats.applied, color: 'bg-blue-500' },
              { label: 'Matched (pending review)', val: stats.matched, color: 'bg-green-500' },
              { label: 'Unmatched', val: stats.unmatched, color: 'bg-gray-600' },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-32 text-xs text-gray-400 text-right">{label}</div>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div
                    className={`${color} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.round((val / stats.total_files) * 100)}%` }}
                  />
                </div>
                <div className="w-12 text-xs text-gray-400">{val?.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources + Recent Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sources */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">Storage Sources</h2>
            <Database className="w-4 h-4 text-gray-500" />
          </div>
          {sources.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">
              No sources yet — add one in Settings
            </p>
          ) : (
            <div className="space-y-2">
              {sources.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.provider_type} · {s.file_count?.toLocaleString()} files</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${s.is_active ? 'badge-matched' : 'badge-skipped'}`}>
                      {s.is_active ? 'active' : 'off'}
                    </span>
                    <button
                      onClick={() => api.scanSource(s.id).then(() => setTimeout(load, 500))}
                      className="btn-ghost text-xs py-1 px-2"
                    >
                      Scan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Jobs */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Recent Scan Jobs</h2>
          {jobs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No scan jobs yet</p>
          ) : (
            <div className="space-y-2">
              {jobs.map(j => (
                <div key={j.id} className="flex items-start justify-between py-2 border-b border-gray-700 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-gray-300">
                      {j.source_name} — Job #{j.id}
                    </p>
                    <p className="text-xs text-gray-500">
                      {j.files_found} found · {j.files_matched} matched
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(j.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`badge badge-${
                    j.status === 'completed' ? 'matched' :
                    j.status === 'running' ? 'searching' :
                    j.status === 'failed' ? 'error' : 'skipped'
                  }`}>{j.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
