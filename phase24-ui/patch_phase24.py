#!/usr/bin/env python3
"""Phase 24 surgical patches for Mission Control UI. Applies exact replacements, fails loudly on mismatch."""
import sys

BASE = '/home/nolan/worktrees/constitutional-convergence-authority-law/CascadeProjects/infra/ui-next/src'

PATCHES = [
    # KnowledgeGalaxy: rewire /api/v1/knowledge-graph -> /mc/knowledge with node mapping
    ('components/KnowledgeGalaxy.tsx', [
        (
"""  const fetchData = useCallback(async () => {
    try {
      const result = await fetchJson('/api/v1/knowledge-graph')
      setData(result)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch knowledge graph')
    } finally {
      setLoading(false)
    }
  }, [])""",
"""  const fetchData = useCallback(async () => {
    try {
      const result = await fetchJson('/mc/knowledge?limit=100')
      const rawNodes: Array<{
        node_id: string
        node_type: string
        label: string
        confidence?: number
        namespace?: string
      }> = result.nodes ?? []
      const typeOf = (t: string): 'Authority' | 'Capability' | 'Implementation' => {
        const lower = (t || '').toLowerCase()
        if (lower.includes('authority')) return 'Authority'
        if (lower.includes('capability')) return 'Capability'
        return 'Implementation'
      }
      const mapped: KGNode[] = rawNodes.map(n => {
        const t = typeOf(n.node_type)
        return {
          id: n.node_id,
          name: n.label || n.node_id,
          type: t,
          color: TYPE_COLORS[t] || '#6B7280',
          confidence: n.confidence,
          authority: n.namespace,
        }
      })
      setData({ nodes: mapped, edges: [] })
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch knowledge graph')
    } finally {
      setLoading(false)
    }
  }, [])""",
        ),
        (
"""  const edges = useMemo(() => {
    if (!data) return []
    return data.edges.map(e => {""",
"""  const edges = useMemo(() => {
    if (!data) return []
    return (data.edges ?? []).map(e => {""",
        ),
        (
"""        <h3 className="text-sm font-semibold text-historical-200 uppercase tracking-wider mr-auto">Knowledge Galaxy</h3>""",
"""        <h3 className="text-sm font-semibold text-historical-200 uppercase tracking-wider mr-auto">Knowledge Galaxy</h3>
        <span className="text-[10px] text-historical-500 font-mono hidden lg:inline">source: /mc/knowledge (nodes only; no edge feed)</span>""",
        ),
    ]),
    # LivingRepository: rewire /api/v1/repository/living -> /system/state repository
    ('components/LivingRepository.tsx', [
        (
"""import { useState, useEffect } from 'react'""",
"""import { useState, useEffect } from 'react'
import { fetchJson } from '@/lib/gateway'""",
        ),
        (
"""  useEffect(() => {
    fetch('/api/v1/repository/living')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])""",
"""  useEffect(() => {
    fetchJson('/system/state')
      .then(d => {
        const repo = d.repository ?? {}
        const entries: Array<[string, number, string]> = [
          ['Intents', repo.intents ?? 0, '#8B5CF6'],
          ['Authorities', repo.authorities ?? 0, '#F59E0B'],
          ['Capabilities', repo.capabilities ?? 0, '#3B82F6'],
          ['Specifications', repo.specifications ?? 0, '#22C55E'],
          ['Nodes', repo.total_nodes ?? 0, '#06B6D4'],
          ['Edges', repo.total_edges ?? 0, '#A855F7'],
        ]
        const max = Math.max(...entries.map(([, v]) => v), 1)
        setData({
          categories: entries.map(([name, value, color]) => ({ name, value, max, color })),
          most_active: '',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])""",
        ),
        (
"""      <h2 className="text-lg font-semibold text-historical-100 mb-5">Living Repository</h2>""",
"""      <h2 className="text-lg font-semibold text-historical-100">Living Repository</h2>
      <p className="text-[10px] text-historical-500 font-mono mt-1 mb-5">source: /system/state repository via SystemAuthority</p>""",
        ),
    ]),
    # gateway.ts: /api/v1/chat -> /api/v1/ollama/chat (2 occurrences)
    ('lib/gateway.ts', [
        (
"""  const response = await fetch(`${GATEWAY_URL}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false,
      temperature: config.temperature || 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Gateway error: ${response.status}`);
  }

  const data = await response.json();
  yield data.content;""",
"""  const response = await fetch(`${GATEWAY_URL}/api/v1/ollama/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      stream: false,
      temperature: config.temperature || 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`Gateway error: ${response.status}`);
  }

  const data = await response.json();
  yield data.content;""",
        ),
        (
"""  const response = await fetch(`${GATEWAY_URL}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false,
      temperature: config.temperature || 0.7
    })
  });""",
"""  const response = await fetch(`${GATEWAY_URL}/api/v1/ollama/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      stream: false,
      temperature: config.temperature || 0.7
    })
  });""",
        ),
    ]),
    # chat/page.tsx: hardcoded phantom /api/v1/chat -> gateway /api/v1/ollama/chat
    ('app/chat/page.tsx', [
        (
"""      const response = await fetch('http://localhost:8080/api/v1/chat', {""",
"""      const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080'
      const response = await fetch(`${gatewayUrl}/api/v1/ollama/chat`, {""",
        ),
    ]),
    # app/page.tsx: remove hardcoded "All systems nominal", relabel chat link
    ('app/page.tsx', [
        (
"""        <div className="mt-6 text-xs text-historical-600">
          <span className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-learning-400" />
            All systems nominal
          </span>
        </div>""",
"""        <div className="mt-6 text-xs text-historical-600">
          <span className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-historical-600" />
            Live system status is shown inside the Command Center
          </span>
        </div>""",
        ),
        (
"""            Cockpit View""",
"""            Chat""",
        ),
    ]),
]

def main():
    failures = []
    for rel, pairs in PATCHES:
        path = f'{BASE}/{rel}'
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        for old, new in pairs:
            if old not in content:
                failures.append(f'{rel}: OLD TEXT NOT FOUND:\n{old[:160]}...')
                continue
            if content.count(old) > 1:
                failures.append(f'{rel}: OLD TEXT MATCHES {content.count(old)} TIMES (not unique):\n{old[:160]}...')
                continue
            content = content.replace(old, new, 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'patched {rel}')
    if failures:
        print('\nFAILURES:', file=sys.stderr)
        for f_ in failures:
            print(f_, file=sys.stderr)
        sys.exit(1)
    print('ALL PATCHES APPLIED')

if __name__ == '__main__':
    main()
