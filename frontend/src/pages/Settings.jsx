import { useState, useEffect } from 'react'
import { Save, Clock, Users, Plus, Trash2, Shield, ShieldOff } from 'lucide-react'
import api from '../api'
import { useAuth } from '../hooks/useAuth'

const SCHEDULE_OPTIONS = [
  { value: 0, label: 'Manual only' },
  { value: 1, label: 'Every hour' },
  { value: 6, label: 'Every 6 hours' },
  { value: 12, label: 'Every 12 hours' },
  { value: 24, label: 'Daily' },
  { value: 48, label: 'Every 2 days' },
  { value: 168, label: 'Weekly' },
]

export default function Settings() {
  const { user, setUser } = useAuth()
  const [schedule, setSchedule] = useState(user?.scan_schedule_hours ?? 0)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleMsg, setScheduleMsg] = useState(null)

  // Admin
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', is_admin: false })
  const [addingUser, setAddingUser] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)

  useEffect(() => {
    if (user?.is_admin) {
      api.getUsers().then(setUsers).catch(console.error)
    }
  }, [user])

  const handleSaveSchedule = async () => {
    setSavingSchedule(true)
    try {
      const updated = await api.updateSchedule(schedule)
      setUser(updated)
      setScheduleMsg({ type: 'ok', text: 'Schedule saved!' })
    } catch (e) {
      setScheduleMsg({ type: 'err', text: e.message })
    } finally {
      setSavingSchedule(false)
      setTimeout(() => setScheduleMsg(null), 3000)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) return
    setAddingUser(true)
    try {
      const created = await api.createUser(newUser)
      setUsers(u => [...u, created])
      setNewUser({ username: '', email: '', password: '', is_admin: false })
      setShowAddUser(false)
    } catch (e) {
      alert(e.message)
    } finally {
      setAddingUser(false)
    }
  }

  const handleToggleAdmin = async (u) => {
    const updated = await api.updateUser(u.id, { is_admin: !u.is_admin })
    setUsers(us => us.map(x => x.id === u.id ? { ...x, is_admin: updated.is_admin } : x))
  }

  const handleToggleActive = async (u) => {
    const updated = await api.updateUser(u.id, { is_active: !u.is_active })
    setUsers(us => us.map(x => x.id === u.id ? { ...x, is_active: updated.is_active } : x))
  }

  const handleDeleteUser = async (u) => {
    if (!confirm(`Delete user "${u.username}"? All their data will be removed.`)) return
    await api.deleteUser(u.id)
    setUsers(us => us.filter(x => x.id !== u.id))
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Account info */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Background Scan Schedule
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Automatically re-scan your sources to discover new files and update metadata.
        </p>
        <div className="flex items-center gap-3">
          <select
            value={schedule}
            onChange={e => setSchedule(Number(e.target.value))}
            className="input w-48"
          >
            {SCHEDULE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={handleSaveSchedule}
            disabled={savingSchedule}
            className="btn-primary flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {savingSchedule ? 'Saving…' : 'Save'}
          </button>
          {scheduleMsg && (
            <span className={`text-sm ${scheduleMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
              {scheduleMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* Profile */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Your Account</h2>
        <div className="space-y-1 text-sm">
          <div className="flex gap-3">
            <span className="text-gray-500 w-24">Username</span>
            <span className="text-gray-200">{user?.username}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-gray-500 w-24">Email</span>
            <span className="text-gray-200">{user?.email}</span>
          </div>
          <div className="flex gap-3">
            <span className="text-gray-500 w-24">Role</span>
            <span className={user?.is_admin ? 'text-yellow-400' : 'text-gray-400'}>
              {user?.is_admin ? '⭐ Admin' : 'User'}
            </span>
          </div>
        </div>
      </div>

      {/* Admin: User management */}
      {user?.is_admin && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Users className="w-4 h-4" /> User Management
            </h2>
            <button
              onClick={() => setShowAddUser(v => !v)}
              className="btn-secondary text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add User
            </button>
          </div>

          {showAddUser && (
            <div className="mb-4 bg-gray-700/50 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-300">New User</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Username</label>
                  <input value={newUser.username}
                    onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
                    className="input text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Email</label>
                  <input value={newUser.email} type="email"
                    onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                    className="input text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Password</label>
                  <input value={newUser.password} type="password"
                    onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                    className="input text-sm" />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input type="checkbox"
                      checked={newUser.is_admin}
                      onChange={e => setNewUser(u => ({ ...u, is_admin: e.target.checked }))}
                      className="accent-brand-500"
                    />
                    Admin
                  </label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddUser(false)} className="btn-ghost text-sm">Cancel</button>
                <button onClick={handleAddUser} disabled={addingUser} className="btn-primary text-sm">
                  {addingUser ? 'Adding…' : 'Create User'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id}
                className={`flex items-center gap-3 py-2 border-b border-gray-700 last:border-0
                  ${!u.is_active ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-200 font-medium">{u.username}</span>
                    {u.is_admin && <span className="badge bg-yellow-900 text-yellow-300">admin</span>}
                    {!u.is_active && <span className="badge badge-skipped">disabled</span>}
                  </div>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                {u.id !== user.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleAdmin(u)}
                      title={u.is_admin ? 'Remove admin' : 'Make admin'}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-yellow-400 transition-colors"
                    >
                      {u.is_admin ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="btn-ghost text-xs"
                    >
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDeleteUser(u)}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {u.id === user.id && (
                  <span className="text-xs text-gray-600 italic">you</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* About */}
      <div className="card p-5 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-400">MusicManager v1.0</p>
        <p>Metadata via <a href="https://musicbrainz.org" target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">MusicBrainz</a> (free, open database)</p>
        <p>Tag reading/writing: mutagen · Storage: WebDAV (Nextcloud) · DB: SQLite</p>
        <p>Future providers: Amazon S3, OneDrive, Google Drive</p>
      </div>
    </div>
  )
}
