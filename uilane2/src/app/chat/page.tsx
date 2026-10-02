'use client'

import { useState } from 'react'
import MissionControlHeader from '@/components/MissionControlHeader'
import PremiumChatBubble from '@/components/PremiumChatBubble'
import ArchitectureView from '@/components/ArchitectureView'
import CockpitDashboard from '@/components/CockpitDashboard'
import EmptyStateRedesign from '@/components/EmptyStateRedesign'
import PromptLibrary from '@/components/PromptLibrary'
import { Send, LayoutGrid, Monitor, Activity, Gauge } from 'lucide-react'

type ViewMode = 'cockpit' | 'chat' | 'architecture'

export default function ChatPage() {
  const [messages, setMessages] = useState<Array<{role: string, content: string, metadata?: any, timestamp?: Date}>>([])
  const [input, setInput] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('cockpit')
  const [isStreaming, setIsStreaming] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    setMessages([...messages, userMessage])
    setInput('')
    setIsStreaming(true)

    try {
      const response = await fetch('/gateway/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      })

      if (response.ok) {
        const data = await response.json()

        const assistantMessage = {
          role: 'assistant',
          content: data.content,
          metadata: {
            model: data.model,
            provider: data.provider,
            generationTime: data.latency_ms / 1000
          },
          timestamp: new Date()
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Request failed: ${errorData.error || response.statusText}`,
          timestamp: new Date()
        }])
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }])
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-historical-950">
      {/* Mission Control Header */}
      <MissionControlHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Prompt Library Sidebar (only in chat mode) */}
        {viewMode === 'chat' && <PromptLibrary />}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* View Mode Selector */}
          <div className="bg-historical-900 border-b border-historical-700 px-4 py-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('cockpit')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  viewMode === 'cockpit'
                    ? 'bg-constitutional-600 text-white'
                    : 'text-historical-400 hover:bg-historical-800'
                }`}
              >
                <Gauge className="w-4 h-4" />
                Cockpit
              </button>
              <button
                onClick={() => setViewMode('chat')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  viewMode === 'chat'
                    ? 'bg-runtime-600 text-white'
                    : 'text-historical-400 hover:bg-historical-800'
                }`}
              >
                <Monitor className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setViewMode('architecture')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  viewMode === 'architecture'
                    ? 'bg-runtime-600 text-white'
                    : 'text-historical-400 hover:bg-historical-800'
                }`}
              >
                <Activity className="w-4 h-4" />
                Architecture
              </button>
            </div>
          </div>

          {/* Content Area */}
          {viewMode === 'cockpit' && (
            <div className="flex-1 overflow-y-auto">
              <CockpitDashboard />
            </div>
          )}

          {viewMode === 'chat' && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {messages.length === 0 ? (
                  <EmptyStateRedesign />
                ) : (
                  <div className="max-w-4xl mx-auto">
                    {messages.map((msg, i) => (
                      <PremiumChatBubble
                        key={i}
                        role={msg.role as 'user' | 'assistant'}
                        content={msg.content}
                        metadata={msg.metadata}
                        timestamp={msg.timestamp}
                      />
                    ))}
                    {isStreaming && (
                      <div className="flex justify-center py-4">
                        <div className="flex items-center gap-2 text-observability-400">
                          <div className="w-2 h-2 bg-observability-400 rounded-full animate-pulse" />
                          <div className="w-2 h-2 bg-observability-400 rounded-full animate-pulse delay-100" />
                          <div className="w-2 h-2 bg-observability-400 rounded-full animate-pulse delay-200" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-historical-700 bg-historical-900">
                <div className="max-w-4xl mx-auto flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 bg-historical-800 border border-historical-700 rounded-lg px-4 py-3 text-historical-100 placeholder-historical-500 focus:outline-none focus:ring-2 focus:ring-runtime-500 focus:border-transparent"
                    placeholder="Ask CRX anything..."
                    disabled={isStreaming}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isStreaming || !input.trim()}
                    className="bg-runtime-600 hover:bg-runtime-700 disabled:bg-historical-700 disabled:text-historical-500 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {viewMode === 'architecture' && (
            <div className="flex-1 overflow-y-auto">
              <ArchitectureView />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
