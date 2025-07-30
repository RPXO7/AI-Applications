"use client"

import { useState, useRef, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { Send } from "lucide-react"
import { ChatMessage } from "@/types"

// --- UI Components ---
const ChatBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === "user"
  return (
    <div
      className={`flex items-end gap-3 ${isUser ? "justify-end" : ""}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--primary)' }}>
          <span className="text-white text-sm font-bold">AI</span>
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

const ChatInput = ({ onSend, isLoading }: { onSend: (text: string) => void, isLoading: boolean }) => {
  const [text, setText] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim()) {
      onSend(text)
      setText("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-4 p-4 border-t" style={{ borderColor: 'var(--border)' }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your message..."
        className="flex-grow px-4 py-3 border rounded-full focus:outline-none focus:ring-2 transition-colors disabled:opacity-50"
        style={{
          background: 'var(--muted)',
          color: 'var(--foreground)',
          borderColor: 'var(--border)',
          '--tw-ring-color': 'var(--primary)'
        }}
        disabled={isLoading}
      />
      <button 
        type="submit" 
        className="p-3 rounded-full transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        disabled={isLoading}
      >
        <Send size={20} />
      </button>
    </form>
  )
}

// --- Main Chatbot Page ---
export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [...messages, userMessage] }),
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
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `Error: ${err.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] rounded-xl card-shadow-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h1 className="text-2xl font-bold p-6 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', color: 'var(--card-foreground)' }}>
        💬 Basic AI Chatbot
      </h1>
      <div ref={chatContainerRef} className="flex-grow p-6 space-y-4 overflow-y-auto" style={{ background: 'var(--muted)' }}>
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
      </div>
      {error && (
        <div className="p-4 border-t" style={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--border)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  )
}

