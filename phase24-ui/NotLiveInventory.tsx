'use client'

interface SurfaceEntry {
  name: string
  classification: string
  reason: string
}

const SURFACES: SurfaceEntry[] = [
  { name: 'ConstitutionalLifecycle', classification: 'PHANTOM', reason: 'Calls /api/lifecycle, which does not exist. Renders a default-healthy view that inverts failure into success.' },
  { name: 'NightShift', classification: 'PHANTOM', reason: 'Calls /api/v1/system/nightshift, which does not exist.' },
  { name: 'DecisionEngine', classification: 'PHANTOM', reason: 'Calls /api/v1/decision/weights, which does not exist. Persists weight edits only to local state, not to any backend.' },
  { name: 'ConstitutionalMixer', classification: 'PHANTOM', reason: 'Calls /api/v1/mixer, which does not exist. Persists mix edits only to local state.' },
  { name: 'ReasoningPuppetStrings', classification: 'PHANTOM', reason: 'Calls /api/v1/reasoning/weights, which does not exist. Persists edits only to local state.' },
  { name: 'OllamaControlRoom', classification: 'PHANTOM', reason: 'Calls /api/v1/ollama/jobs and /api/v1/ollama/status, which do not exist. Real routes: /api/v1/ollama/chat, /api/v1/ollama/models, /api/v1/ollama/autocomplete.' },
  { name: 'TimeMachine', classification: 'UNWIRED', reason: 'Calls /api/v1/timeline, which does not exist. Timeline visualization is preserved for a future real timeline route.' },
  { name: 'MCPOrchestration', classification: 'PHANTOM', reason: 'Calls /api/v1/mcp/*, which do not exist, including pause/resume/reconnect mutations with no backend. Preserved read-only design for a future real provider route.' },
  { name: 'ConstitutionalObjects', classification: 'UNWIRED', reason: 'Calls /api/v1/constitutional/objects, which does not exist. Authority/law browser preserved for a future real route.' },
  { name: 'OrganizationalHealth', classification: 'UNWIRED', reason: 'Calls /api/v1/health/organizational, which does not exist. Preserved for a future real health route.' },
  { name: 'MissionControlHeader', classification: 'PHANTOM', reason: 'Already unmounted. Polled nonexistent routes for its status pills.' },
  { name: 'ObservatoryMode', classification: 'PHANTOM', reason: 'Already unmounted. No backing route.' },
  { name: 'ArchitectureView', classification: 'PHANTOM', reason: 'Already unmounted. Rendered a static diagram with no live data.' },
]

const CLASS_COLORS: Record<string, string> = {
  PHANTOM: 'bg-red-900/40 text-red-300 border-red-700/50',
  UNWIRED: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
}

export default function NotLiveInventory() {
  return (
    <div className="bg-historical-900 rounded-lg border border-historical-700 p-5">
      <h3 className="text-sm font-semibold text-historical-200 uppercase tracking-wider">
        Preserved surfaces, not live
      </h3>
      <p className="text-xs text-historical-500 mt-1">
        These components remain in the tree but are not mounted in production. Each calls a backend
        route that does not exist, or persists edits only to local state. They are preserved, not
        deleted, per the standing preservation law. Mission Control stays a projection surface; it
        must not become another authority.
      </p>
      <div className="mt-4 space-y-2">
        {SURFACES.map(s => (
          <div key={s.name} className="flex items-start gap-3 px-3 py-2 bg-historical-800/30 rounded-lg">
            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${CLASS_COLORS[s.classification] ?? 'bg-historical-700 text-historical-300 border-historical-600'}`}>
              {s.classification}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-historical-200 font-mono">{s.name}</p>
              <p className="text-xs text-historical-500">{s.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
