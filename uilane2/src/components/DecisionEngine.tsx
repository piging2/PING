'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchJson } from '@/lib/gateway'

interface WeightConfig {
  key: string
  label: string
  color: string
}

const WEIGHTS: WeightConfig[] = [
  { key: 'impact', label: 'Impact', color: '#D97706' },
  { key: 'replay_safety', label: 'Replay Safety', color: '#DC2626' },
  { key: 'tech_debt', label: 'Tech Debt', color: '#F97316' },
  { key: 'learning_roi', label: 'Learning ROI', color: '#059669' },
  { key: 'novelty', label: 'Novelty', color: '#7C3AED' },
  { key: 'confidence', label: 'Confidence', color: '#2563EB' },
]

export default function DecisionEngine() {
  const [values, setValues] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson('/api/v1/decision/weights')
      .then((data) => {
        const initial: Record<string, number> = {}
        for (const w of WEIGHTS) {
          initial[w.key] = data[w.key] ?? 0.5
        }
        setValues(initial)
      })
      .catch(() => {
        const fallback: Record<string, number> = {}
        for (const w of WEIGHTS) fallback[w.key] = 0.5
        setValues(fallback)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleChange = useCallback((key: string, val: number) => {
    setValues((prev) => ({ ...prev, [key]: val }))
  }, [])

  const handleCommit = useCallback((key: string, val: number) => {
    fetch('/gateway/api/v1/decision/weights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: val }),
    }).catch(() => {})
  }, [])

  return (
    <div className="bg-historical-900 rounded-lg border border-historical-700 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-historical-700 bg-historical-800/50">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-constitutional-400">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <h3 className="text-sm font-semibold text-historical-200 uppercase tracking-wider">Decision Engine</h3>
      </div>
      <div className="p-4 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-historical-500 border-t-constitutional-400 rounded-full animate-spin" />
          </div>
        ) : (
          WEIGHTS.map((w) => {
            const val = values[w.key] ?? 0.5
            return (
              <div key={w.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-historical-300 uppercase">
                    {w.label}
                  </span>
                  <span className="text-xs font-mono text-historical-100 tabular-nums">
                    {val.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-historical-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{ width: `${val * 100}%`, backgroundColor: w.color }}
                    />
                  </div>
                </div>
                <div className="relative h-5 flex items-center">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={val}
                    onChange={(e) => handleChange(w.key, parseFloat(e.target.value))}
                    onMouseUp={(e) => handleCommit(w.key, parseFloat((e.target as HTMLInputElement).value))}
                    onTouchEnd={(e) => handleCommit(w.key, parseFloat((e.target as HTMLInputElement).value))}
                    className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer z-10 opacity-0"
                  />
                  <div className="flex-1 h-1.5 bg-historical-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-75"
                      style={{
                        width: `${val * 100}%`,
                        background: `linear-gradient(90deg, ${w.color}44, ${w.color})`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
