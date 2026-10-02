'use client'

import { useState, useEffect } from 'react'
import ConstitutionalMixer from '@/components/ConstitutionalMixer'
import DecisionEngine from '@/components/DecisionEngine'
import KnowledgeGalaxy from '@/components/KnowledgeGalaxy'
import TimeMachine from '@/components/TimeMachine'
import OllamaControlRoom from '@/components/OllamaControlRoom'
import ReasoningPuppetStrings from '@/components/ReasoningPuppetStrings'
import SemanticMemory from '@/components/SemanticMemory'
import OrganizationalHealth from '@/components/OrganizationalHealth'
import LivingRepository from '@/components/LivingRepository'
import MissionCards from '@/components/MissionCards'
import ConstitutionalObjects from '@/components/ConstitutionalObjects'
import NightShift from '@/components/NightShift'
import CockpitDashboard from '@/components/CockpitDashboard'
import MCPOrchestration from '@/components/MCPOrchestration'
import ConstitutionalLifecycle from '@/components/ConstitutionalLifecycle'

type ViewTab = 'cockpit' | 'command' | 'chat'

export default function CommandCenterPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('command')
  const [nightShift, setNightShift] = useState(false)
  // UI truth fix 2026-09-19: /api/v1/ollama/status exists only on the
  // legacy dev stub, not on the convergence gateway. Initial 'unknown' and
  // any probe failure stays 'unknown'; never a stale 'idle'.
  const [ollamaStatus, setOllamaStatus] = useState('unknown')

  const refreshOllama = () => {
    fetch('/gateway/api/v1/ollama/status')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => setOllamaStatus(typeof d.status === 'string' ? d.status : 'unknown'))
      .catch(() => setOllamaStatus('unknown'))
  }

  useEffect(() => {
    fetch('/gateway/api/v1/system/nightshift')
      .then(r => r.json())
      .then(d => setNightShift(d.active))
      .catch(() => {})
    refreshOllama()
    const interval = setInterval(refreshOllama, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`min-h-screen flex flex-col ${nightShift ? 'bg-historical-980' : 'bg-historical-950'}`}>
      {/* Top Navigation Bar */}
      <header className={`border-b ${nightShift ? 'border-indigo-900/50 bg-historical-980' : 'border-historical-700 bg-historical-900'}`}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-constitutional-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <span className="font-bold text-historical-100 text-sm tracking-widest uppercase">Constitutional Command Center</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Ollama Status */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
              ollamaStatus === 'thinking' ? 'bg-learning-900/50 text-learning-400' :
              ollamaStatus === 'idle' ? 'bg-historical-800 text-historical-400' :
              'bg-runtime-900/50 text-runtime-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                ollamaStatus === 'thinking' ? 'bg-learning-400 animate-pulse' :
                ollamaStatus === 'idle' ? 'bg-historical-500' :
                'bg-runtime-400'
              }`} />
              <span className="capitalize">{ollamaStatus || 'offline'}</span>
            </div>

            {/* Night Shift Badge */}
            {nightShift && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-indigo-900/50 text-indigo-400">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                Night Shift
              </div>
            )}

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-historical-800 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('cockpit')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'cockpit'
                    ? 'bg-constitutional-600 text-white'
                    : 'text-historical-400 hover:text-historical-200'
                }`}
              >
                Cockpit
              </button>
              <button
                onClick={() => setActiveTab('command')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'command'
                    ? 'bg-runtime-600 text-white'
                    : 'text-historical-400 hover:text-historical-200'
                }`}
              >
                Command Center
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-learning-600 text-white'
                    : 'text-historical-400 hover:text-historical-200'
                }`}
              >
                Chat
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'cockpit' && <CockpitDashboard />}

        {activeTab === 'command' && (
          <div className="p-4 space-y-4">
            {/* Constitutional Lifecycle (full width) */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <ConstitutionalLifecycle />
              </div>
            </div>

            {/* Top Row: Scores + Night Shift + Living Repository */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3">
                <OrganizationalHealth />
              </div>
              <div className="col-span-3">
                <NightShift />
              </div>
              <div className="col-span-6">
                <LivingRepository />
              </div>
            </div>

            {/* Row 2: Decision Engine + Constitutional Mixer + Reasoning */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4">
                <DecisionEngine />
              </div>
              <div className="col-span-4">
                <ConstitutionalMixer />
              </div>
              <div className="col-span-4">
                <ReasoningPuppetStrings />
              </div>
            </div>

            {/* Row 3: Knowledge Galaxy (spans full width) */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <KnowledgeGalaxy />
              </div>
            </div>

            {/* Row 4: Ollama Control Room + Time Machine */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-5">
                <OllamaControlRoom />
              </div>
              <div className="col-span-7">
                <TimeMachine />
              </div>
            </div>

            {/* Row 5: Semantic Memory + Constitutional Objects */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-5">
                <SemanticMemory />
              </div>
              <div className="col-span-7">
                <ConstitutionalObjects />
              </div>
            </div>

            {/* Row 6: Mission Cards (full width) */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <MissionCards />
              </div>
            </div>

            {/* Row 7: MCP Orchestration (full width) */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <MCPOrchestration />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-historical-500">
              <p className="text-lg mb-2">Chat mode — coming soon</p>
              <p className="text-sm">Switch to Cockpit or Command Center for operations</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
