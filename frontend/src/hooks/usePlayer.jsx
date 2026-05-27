import { createContext, useContext, useState, useRef, useEffect } from 'react'

const PlayerCtx = createContext(null)

export function PlayerProvider({ children }) {
  const [track, setTrack] = useState(null)   // { id, filename, streamUrl, tags }
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0-1
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [queue, setQueue] = useState([])
  const audioRef = useRef(new Audio())

  const audio = audioRef.current

  useEffect(() => {
    audio.volume = volume
  }, [volume])

  useEffect(() => {
    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration)
    }
    const onDuration = () => setDuration(audio.duration)
    const onEnded = () => {
      setPlaying(false)
      // Auto-advance queue
      setQueue(q => {
        if (q.length > 0) {
          const [next, ...rest] = q
          playTrack(next)
          return rest
        }
        return q
      })
    }
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onDuration)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onDuration)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const playTrack = (t) => {
    if (!t) return
    audio.src = t.streamUrl
    audio.play().then(() => setPlaying(true)).catch(console.error)
    setTrack(t)
    setProgress(0)
  }

  const togglePlay = () => {
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().then(() => setPlaying(true)).catch(console.error)
    }
  }

  const seek = (ratio) => {
    if (audio.duration) {
      audio.currentTime = ratio * audio.duration
      setProgress(ratio)
    }
  }

  const addToQueue = (tracks) => {
    setQueue(q => [...q, ...(Array.isArray(tracks) ? tracks : [tracks])])
  }

  const clearQueue = () => setQueue([])

  return (
    <PlayerCtx.Provider value={{
      track, playing, progress, duration, volume,
      queue, setVolume, playTrack, togglePlay, seek,
      addToQueue, clearQueue,
    }}>
      {children}
    </PlayerCtx.Provider>
  )
}

export const usePlayer = () => useContext(PlayerCtx)
