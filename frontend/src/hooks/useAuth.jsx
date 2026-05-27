import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('mm_token')
    if (token) {
      api.me()
        .then(setUser)
        .catch(() => localStorage.removeItem('mm_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    const data = await api.login(username, password)
    localStorage.setItem('mm_token', data.access_token)
    const me = await api.me()
    setUser(me)
    return me
  }

  const logout = () => {
    localStorage.removeItem('mm_token')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
