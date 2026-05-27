/**
 * Typed API client for MusicManager backend.
 */

const BASE = '/api'

function getToken() {
  return localStorage.getItem('mm_token')
}

async function req(method, path, body, opts = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...opts,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

const api = {
  // ── Auth ────────────────────────────────────────────────────────────────
  login: (username, password) => {
    const form = new URLSearchParams({ username, password })
    return fetch(BASE + '/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    }).then(async r => {
      if (!r.ok) throw new Error((await r.json()).detail || 'Login failed')
      return r.json()
    })
  },
  register: (username, email, password) =>
    req('POST', '/auth/register', { username, email, password }),
  me: () => req('GET', '/auth/me'),
  updateSchedule: (hours) => req('PATCH', '/auth/me/schedule', { scan_schedule_hours: hours }),

  // ── Sources ─────────────────────────────────────────────────────────────
  getSources: () => req('GET', '/sources/'),
  createSource: (data) => req('POST', '/sources/', data),
  updateSource: (id, data) => req('PATCH', `/sources/${id}`, data),
  deleteSource: (id) => req('DELETE', `/sources/${id}`),
  testSource: (id) => req('POST', `/sources/${id}/test`),
  browseSource: (id, path) => req('GET', `/sources/${id}/browse?path=${encodeURIComponent(path)}`),
  scanSource: (id) => req('POST', `/sources/${id}/scan`),
  getJobs: (sourceId, limit = 10) => req('GET', `/sources/${sourceId}/jobs?limit=${limit}`),

  // ── Files ────────────────────────────────────────────────────────────────
  getFiles: (params = {}) => {
    const q = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.set(k, v) })
    return req('GET', `/files/?${q}`)
  },
  getStats: () => req('GET', '/files/stats'),
  getFile: (id) => req('GET', `/files/${id}`),
  updateProposed: (id, tags) => req('PATCH', `/files/${id}/proposed`, tags),
  applyTags: (id) => req('POST', `/files/${id}/apply`),
  skipFile: (id) => req('POST', `/files/${id}/skip`),
  rematchFile: (id) => req('POST', `/files/${id}/rematch`),
  batchAction: (file_ids, action) => req('POST', '/files/batch', { file_ids, action }),

  // ── Admin ────────────────────────────────────────────────────────────────
  getUsers: () => req('GET', '/admin/users'),
  createUser: (data) => req('POST', '/admin/users', data),
  updateUser: (id, data) => req('PATCH', `/admin/users/${id}`, data),
  deleteUser: (id) => req('DELETE', `/admin/users/${id}`),

  // ── Stream URL (no auth needed in URL, backend uses token from header) ──
  streamUrl: (fileId) => `${BASE}/files/${fileId}/stream`,
}

export default api
