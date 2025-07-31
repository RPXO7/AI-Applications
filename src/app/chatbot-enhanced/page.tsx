"use client"

import { useState, useRef, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { Send, Bot, BrainCircuit, Users, Database, Zap, MessageSquare } from "lucide-react"
import { ChatMessage } from "@/types"

const AI_PERSONAS = {
  general: { 
    name: "General AI",
    displayName: "🤖 General AI", 
    icon: <Bot size={20} />,
    description: "Versatile AI assistant for general questions and tasks"
  },
  developer: { 
    name: "Developer",
    displayName: "👨‍💻 Developer", 
    icon: <BrainCircuit size={20} />,
    description: "Expert software developer with code examples and best practices"
  },
  creative: { 
    name: "Creative",
    displayName: "🎨 Creative", 
    icon: <Users size={20} />,
    description: "Creative professional for writing, design, and content creation"
  },
  analyst: { 
    name: "Analyst",
    displayName: "📊 Analyst", 
    icon: <Users size={20} />,
    description: "Business analyst for data insights and strategic planning"
  },
}

// --- LangChain Feature Indicators ---
const LangChainFeatures = () => (
  <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
    <Database size={14} />
    <span>Conversation Memory</span>
    <Zap size={14} />
    <span>Dynamic Prompts</span>
    <MessageSquare size={14} />
    <span>Streaming Responses</span>
  </div>
)

// --- UI Components ---
const ChatBubble = ({ message, persona }: { message: ChatMessage, persona: string }) => {
  const isUser = message.role === "user"
  return (
    <div
      className={`flex items-end gap-3 ${isUser ? "justify-end" : ""}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
          {AI_PERSONAS[persona as keyof typeof AI_PERSONAS]?.icon || <Bot size={20} />}
        </div>
      )}
      <div
        className="px-4 py-3 rounded-xl max-w-lg shadow-sm"
        style={{
          background: isUser ? 'var(--primary)' : 'var(--card)',
          color: isUser ? 'var(--primary-foreground)' : 'var(--card-foreground)',
          border: isUser ? 'none' : '1px solid var(--border)'
        }}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--muted)' }}>
          <span className="text-sm font-bold" style={{ color: 'var(--muted-foreground)' }}>You</span>
        </div>
      )}
    </div>
  )
}

const PersonaSelector = ({ persona, setPersona, isLoading }: { persona: string, setPersona: (p: string) => void, isLoading: boolean }) => (
  <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
    <div className="flex items-center justify-center gap-2 mb-2">
      <span className="text-sm font-semibold" style={{ color: 'var(--card-foreground)' }}>AI Persona:</span>
      <select 
        value={persona} 
        onChange={(e) => setPersona(e.target.value)} 
        className="px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{
          background: 'var(--muted)',
          color: 'var(--foreground)',
          borderColor: 'var(--border)'
        }}
        disabled={isLoading}
      >
        {Object.entries(AI_PERSONAS).map(([key, { displayName }]) => (
          <option key={key} value={key}>{displayName}</option>
        ))}
      </select>
    </div>
    <div className="text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
      {AI_PERSONAS[persona as keyof typeof AI_PERSONAS]?.description}
    </div>
    <LangChainFeatures />
  </div>
)

// --- Main Enhanced Chatbot Page ---
export default function EnhancedChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [persona, setPersona] = useState("general")
  const [sessionId] = useState(uuidv4())
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight)
  }, [messages])

  const handleSend = async (text: string) => {
    setIsLoading(true)
    setError(null)
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      const res = await fetch("/api/chat-enhanced", {
        method: "POST",
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          persona,
          sessionId,
        }),
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok || !res.body) {
        throw new Error(await res.text())
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        assistantMessage.content += chunk
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessage.id ? assistantMessage : m))
        )
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] rounded-xl card-shadow-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h1 className="text-2xl font-bold p-6 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', color: 'var(--card-foreground)' }}>
        <BrainCircuit size={24} className="text-blue-500"/>
        LangChain Powered Chatbot
        <span className="text-sm font-normal text-blue-600 ml-2">(Enhanced with Memory & Context)</span>
      </h1>
      <PersonaSelector persona={persona} setPersona={setPersona} isLoading={isLoading} />
      <div ref={chatContainerRef} className="flex-grow p-6 space-y-4 overflow-y-auto" style={{ background: 'var(--muted)' }}>
        {messages.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--muted-foreground)' }}>
            <BrainCircuit size={48} className="mx-auto mb-4 text-blue-500" />
            <h3 className="text-lg font-semibold mb-2">LangChain Enhanced Chat</h3>
            <p className="text-sm mb-4">This chatbot uses LangChain features:</p>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-center gap-2">
                <Database size={12} />
                <span>Conversation Memory - Remembers previous interactions</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Zap size={12} />
                <span>Dynamic Prompts - Adapts responses based on persona</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <MessageSquare size={12} />
                <span>Streaming Responses - Real-time AI responses</span>
              </div>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} persona={persona}/>
        ))}
      </div>
      {error && (
        <div className="p-4 border-t" style={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--border)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      <div className="flex items-center gap-2 p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <input
          type="text"
          placeholder="Ask the AI..."
          className="flex-grow px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            background: 'var(--muted)',
            color: 'var(--foreground)',
            borderColor: 'var(--border)'
          }}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend(e.currentTarget.value)
              e.currentTarget.value = ""
            }
          }}
        />
        <button 
          onClick={() => {
            const input = document.querySelector('input[type="text"]') as HTMLInputElement
            if (input && input.value.trim()) {
              handleSend(input.value)
              input.value = ""
            }
          }} 
          className="p-2 rounded-full transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed" 
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          disabled={isLoading}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  )
}
