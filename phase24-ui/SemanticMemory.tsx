'use client'

import { useState, useEffect } from 'react'
import { fetchJson } from '@/lib/gateway'

interface KnowledgeState {
  status?: string
  knowledge_objects?: number
  reflections?: number
  skills?: number
  policies?: number
  evidence?: number
  proofs?: number
  witnesses?: number
  replay_certificates?: number
  historical_snapshots?: number
}

interface QdrantState {
  status?: string
  collections?: number
  total_points?: number
  total_vectors?: number
}

function fmt(n: number | undefined): string {
  return typeof n === 'number' ? n.toLocaleString() : 'unknown'
}

export default function SemanticMemory() {
  const [knowledge, setKnowledge] = useState<KnowledgeState | null>(null)
  const [qdrant, setQdrant] = useState<QdrantState | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchJson('/system/state')
      .then(d => {
        if (cancelled) return
        setKnowledge(d.knowledge ?? null)
        setQdrant(d.qdrant ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="bg-historical-900 rounded-lg border border-historical-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-historical-800 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-historical-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (failed || !knowledge) {
    return (
      <div className="bg-historical-900 rounded-lg border border-historical-700 p-6">
        <div className="flex items-center gap-3 text-amber-400">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">Memory state unavailable (/system/state did not respond)</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-historical-900 rounded-lg border border-historical-700 p-6">
      <h2 className="text-lg font-semibold text-historical-100">Semantic Memory</h2>
      <p className="text-[10px] text-historical-500 font-mono mt-1 mb-5">
        source: /system/state knowledge + qdrant via SystemAuthority
      </p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatBox label="Knowledge objects" value={fmt(knowledge.knowledge_objects)} />
        <StatBox label="Reflections" value={fmt(knowledge.reflections)} />
        <StatBox label="Skills" value={fmt(knowledge.skills)} />
        <StatBox label="Policies" value={fmt(knowledge.policies)} />
        <StatBox label="Evidence" value={fmt(knowledge.evidence)} />
        <StatBox label="Witnesses" value={fmt(knowledge.witnesses)} />
      </div>

      <h3 className="text-sm font-medium text-historical-300 mb-3">Vector store</h3>
      <div className="grid grid-cols-3 gap-4">
        <StatBox label="Status" value={qdrant?.status ?? 'unknown'} />
        <StatBox label="Collections" value={fmt(qdrant?.collections)} />
        <StatBox label="Total points" value={fmt(qdrant?.total_points)} />
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-historical-800/40 rounded-lg p-3">
      <div className="text-2xl font-bold text-historical-100">{value}</div>
      <div className="text-xs text-historical-500 mt-0.5">{label}</div>
    </div>
  )
}
