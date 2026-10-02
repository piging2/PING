'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchJson } from '@/lib/gateway'

interface ChannelConfig {
  key: string
  label: string
  color: string
}

const CHANNELS: ChannelConfig[] = [
  { key: 'replay', label: 'Replay', color: '#DC2626' },
  { key: 'witness', label: 'Witness', color: '#0891B2' },
  { key: 'learning', label: 'Learning', color: '#059669' },
  { key: 'speed', label: 'Speed', color: '#7C3AED' },
  { key: 'safety', label: 'Safety', color: '#2563EB' },
  { key: 'exploration', label: 'Exploration', color: '#DB2777' },
]

export default function ConstitutionalMixer() {
  const [values, setValues] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson('/api/v1/mixer')
      .then((data) => {
        const initial: Record<string, number> = {}
        for (const ch of CHANNELS) {
          initial[ch.key] = data[ch.key] ?? 0.5
        }
        setValues(initial)
      })
      .catch(() => {
        const fallback: Record<string, number> = {}
        for (const ch of CHANNELS) fallback[ch.key] = 0.5
        setValues(fallback)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleChange = useCallback((key: string, val: number) => {
    setValues((prev) => ({ ...prev, [key]: val }))
  }, [])

  const handleCommit = useCallback((key: string, val: number) => {
    fetch('/gateway/api/v1/mixer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: val }),
    }).catch(() => {})
  }, [])

  return (
    <div className="bg-historical-900 rounded-lg border border-historical-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-historical-700 bg-historical-800/50">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-constitutional-400">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
        <h3 className="text-sm font-semibold text-historical-200 uppercase tracking-wider">Constitutional Mixer</h3>
      </div>
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-historical-500 border-t-constitutional-400 rounded-full animate-spin" />
          </div>
        ) : (
          CHANNELS.map((ch) => {
            const val = values[ch.key] ?? 0.5
            return (
              <div key={ch.key} className="flex items-center gap-3">
                <span className="w-20 text-xs font-semibold text-historical-300 uppercase shrink-0">
                  {ch.label}
                </span>
                <div className="relative flex-1 h-6 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={val}
                    onChange={(e) => handleChange(ch.key, parseFloat(e.target.value))}
                    onMouseUp={(e) => handleCommit(ch.key, parseFloat((e.target as HTMLInputElement).value))}
                    onTouchEnd={(e) => handleCommit(ch.key, parseFloat((e.target as HTMLInputElement).value))}
                    className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer z-10 opacity-0"
                  />
                  <div className="flex-1 h-2 bg-historical-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{
                        width: `${val * 100}%`,
                        background: `linear-gradient(90deg, ${ch.color}66, ${ch.color})`,
                      }}
                    />
                  </div>
                </div>
                <span className="w-12 text-xs font-mono text-historical-100 text-right shrink-0 tabular-nums">
                  {val.toFixed(2)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
