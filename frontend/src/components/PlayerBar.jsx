import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react'
import { usePlayer } from '../hooks/usePlayer'

function fmtTime(secs) {
  if (!secs || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function PlayerBar() {
  const { track, playing, progress, duration, volume, togglePlay, seek, setVolume } = usePlayer()

  if (!track) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-gray-900 border-t border-gray-700 flex items-center px-4 gap-4 z-40 shadow-2xl">

      {/* Track info */}
      <div className="flex items-center gap-3 w-64 min-w-0">
        <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <Music className="w-5 h-5 text-gray-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {track.tags?.title || track.filename}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {track.tags?.artist || ''}
            {track.tags?.artist && track.tags?.album ? ' · ' : ''}
            {track.tags?.album || ''}
          </p>
        </div>
      </div>

      {/* Controls + progress */}
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            {playing
              ? <Pause className="w-4 h-4 text-gray-900" fill="currentColor" />
              : <Play className="w-4 h-4 text-gray-900 ml-0.5" fill="currentColor" />
            }
          </button>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-2 w-full max-w-lg">
          <span className="text-xs text-gray-500 w-10 text-right">
            {fmtTime(progress * duration)}
          </span>
          <div
            className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer group relative"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              seek((e.clientX - rect.left) / rect.width)
            }}
          >
            <div
              className="h-1.5 bg-brand-500 rounded-full relative"
              style={{ width: `${progress * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-xs text-gray-500 w-10">{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 w-32">
        <button onClick={() => setVolume(v => v > 0 ? 0 : 0.8)} className="text-gray-400 hover:text-white">
          {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <input
          type="range" min="0" max="1" step="0.02"
          value={volume}
          onChange={e => setVolume(Number(e.target.value))}
          className="flex-1 accent-brand-500 h-1.5 cursor-pointer"
        />
      </div>

      {/* Tags popover hint */}
      {(track.tags?.genre || track.tags?.year) && (
        <div className="hidden xl:flex flex-col text-xs text-gray-500 w-32">
          {track.tags?.genre && <span>{track.tags.genre}</span>}
          {track.tags?.year && <span>{track.tags.year}</span>}
          {track.bitrate && <span>{track.bitrate} kbps</span>}
        </div>
      )}
    </div>
  )
}
