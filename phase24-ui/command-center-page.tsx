'use client'

import { useState } from 'react'
import KnowledgeGalaxy from '@/components/KnowledgeGalaxy'
import MissionCards from '@/components/MissionCards'
import LivingRepository from '@/components/LivingRepository'
import SemanticMemory from '@/components/SemanticMemory'
import CockpitDashboard from '@/components/CockpitDashboard'
import NotLiveInventory from '@/components/NotLiveInventory'

type ViewTab = 'cockpit' | 'command' | 'chat'

export default function CommandCenterPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('cockpit')

  return (
    <div className="min-h-screen flex flex-col bg-historical-950">
      {/* Top Navigation Bar */}
      <header className="border-b border-historical-700 bg-historical-900">
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
        {activeTab === 'cockpit' && (
          <div className="p-4">
            <CockpitDashboard />
          </div>
        )}

        {activeTab === 'command' && (
          <div className="p-4 space-y-4">
            <p className="text-xs text-historical-500">
              Every panel below reads from a real gateway route and labels its source and scope.
              Surfaces whose backends do not exist are preserved in the tree but not mounted; see the inventory at the bottom.
            </p>

            {/* Row 1: Knowledge Galaxy (full width) */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <KnowledgeGalaxy />
              </div>
            </div>

            {/* Row 2: Mission Cards (full width) */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <MissionCards />
              </div>
            </div>

            {/* Row 3: Living Repository + Semantic Memory */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6">
                <LivingRepository />
              </div>
              <div className="col-span-12 md:col-span-6">
                <SemanticMemory />
              </div>
            </div>

            {/* Row 4: Not-live inventory (full width) */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12">
                <NotLiveInventory />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-historical-500">
              <p className="text-lg mb-2 text-historical-300">Chat lives on its own route</p>
              <p className="text-sm mb-4">The chat surface is served at /chat, backed by /api/v1/ollama/chat.</p>
              <a href="/chat" className="inline-block bg-learning-600 hover:bg-learning-700 text-white px-5 py-2 rounded-lg text-sm transition-colors">
                Open Chat
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
