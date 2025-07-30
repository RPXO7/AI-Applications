"use client"

import { useState, useRef, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { Send, Bot, User, BrainCircuit, Users } from "lucide-react"
import { ChatMessage } from "@/types"

const AI_PERSONAS = {
  general: { name: "🤖 General AI", icon: <Bot size={20} /> },
  developer: { name: "👨‍💻 Developer", icon: <BrainCircuit size={20} /> },
  creative: { name: "🎨 Creative", icon: <Users size={20} /> },
  analyst: { name: "📊 Analyst", icon: <Users size={20} /> },
}

// --- UI Components ---
const ChatBubble = ({ message, persona }: { message: ChatMessage, persona: string }) => {
  const isUser = message.role === "user"
  return (
    <div className={`flex items-start gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          {AI_PERSONAS[persona as keyof typeof AI_PERSONAS]?.icon || <Bot size={20} />}
        </div>
      )}
      <div
        className={`px-4 py-2 rounded-lg max-w-lg shadow-sm ${isUser ? "bg-blue-500 text-white" : "bg-white"}`}
      >
        {message.content}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <User size={20} />
        </div>
      )}
    </div>
  )
}

const PersonaSelector = ({ persona, setPersona, isLoading }: { persona: string, setPersona: (p: string) => void, isLoading: boolean }) => (
  <div className="flex items-center justify-center p-2 bg-gray-100 border-b gap-2">
    <span className="text-sm font-semibold">AI Persona:</span>
    <select 
      value={persona} 
      onChange={(e) => setPersona(e.target.value)} 
      className="px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled={isLoading}
    >
      {Object.entries(AI_PERSONAS).map(([key, { name }]) => (
        <option key={key} value={key}>{name}</option>
      ))}
    </select>
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
      let assistantMessage: ChatMessage = {
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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-gray-50 rounded-lg shadow-inner">
      <h1 className="text-2xl font-bold p-4 border-b bg-white flex items-center gap-2">
        <BrainCircuit size={24} className="text-blue-500"/>
        LangChain Powered Chatbot
      </h1>
      <PersonaSelector persona={persona} setPersona={setPersona} isLoading={isLoading} />
      <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} persona={persona}/>
        ))}
      </div>
      {error && <div className="p-4 text-red-500 bg-red-100 border-t">Error: {error}</div>}
      <div className="flex items-center gap-2 p-4 bg-white border-t">
        <input
          type="text"
          placeholder="Ask the AI..."
          className="flex-grow px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend(e.currentTarget.value)
              e.currentTarget.value = ""
            }
          }}
        />
        <button onClick={() => { /* Send logic from input */ }} className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400" disabled={isLoading}>
          <Send size={20} />
        </button>
      </div>
    </div>
  )
}
