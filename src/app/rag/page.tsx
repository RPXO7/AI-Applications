"use client"

import { useState, useEffect } from "react"
import { Upload, MessageSquare, FileText, Trash2, BrainCircuit } from "lucide-react"

// --- UI Components ---

const DocumentManager = ({ onFileUpload, onClear, docCount, isLoading }: any) => {
  return (
    <div className="p-6 rounded-xl card-shadow-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h2 className="text-xl font-bold mb-4">Document Management</h2>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', opacity: isLoading ? 0.7 : 1 }}
        >
          <Upload size={20} />
          <span>Upload Document</span>
          <input type="file" className="hidden" onChange={onFileUpload} disabled={isLoading} accept=".pdf,.docx,.txt"/>
        </label>
        <div className="text-right">
          <p className="font-semibold">{docCount} documents loaded</p>
          <button onClick={onClear} disabled={isLoading || docCount === 0} className="text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
            style={{ color: 'var(--error)' }}
          >
            <Trash2 size={14} /> Clear All
          </button>
        </div>
      </div>
    </div>
  )
}

const ChatInterface = ({ onQuery, history, isLoading, docCount }: any) => {
  const [query, setQuery] = useState("")

  const handleSend = () => {
    if (query.trim()) {
      onQuery(query)
      setQuery("")
    }
  }

  return (
    <div className="mt-8 p-6 rounded-xl card-shadow-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h2 className="text-xl font-bold mb-4">Ask Questions About Your Documents</h2>
      <div className="h-80 overflow-y-auto p-4 mb-4 rounded-lg" style={{ background: 'var(--muted)' }}>
        {history.length === 0 && <p className="text-center" style={{ color: 'var(--muted-foreground)' }}>Chat history will appear here.</p>}
        {history.map((entry: any, i: number) => (
          <div key={i} className={`mb-4 ${entry.type === 'user' ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-3 rounded-lg max-w-lg shadow-sm`} 
              style={{
                background: entry.type === 'user' ? 'var(--primary)' : 'var(--secondary)',
                color: entry.type === 'user' ? 'var(--primary-foreground)' : 'var(--secondary-foreground)'
              }}
            >
              {entry.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={docCount > 0 ? "Ask a question..." : "Upload a document to start"}
          className="flex-grow px-4 py-3 border rounded-full focus:outline-none focus:ring-2 transition-colors disabled:opacity-50"
          style={{
            background: 'var(--muted)',
            color: 'var(--foreground)',
            borderColor: 'var(--border)',
            '--tw-ring-color': 'var(--primary)'
          }}
          disabled={isLoading || docCount === 0}
        />
        <button onClick={handleSend} disabled={isLoading || !query} className="p-3 rounded-full transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          <MessageSquare size={20} />
        </button>
      </div>
    </div>
  )
}

// --- Main RAG Page ---
export default function RAGPage() {
  const [docCount, setDocCount] = useState(0)
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/rag?action=upload", { method: "POST", body: formData })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setDocCount(data.data.totalDocuments)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuery = async (question: string) => {
    setIsLoading(true)
    setError(null)
    setChatHistory(prev => [...prev, { type: 'user', text: question }])

    try {
      const res = await fetch("/api/rag?action=query", { 
        method: "POST", 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setChatHistory(prev => [...prev, { type: 'ai', text: data.data.answer }])
    } catch (err: any) {
      setError(err.message)
      setChatHistory(prev => [...prev, { type: 'ai', text: `Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleClear = async () => {
    setIsLoading(true)
    try {
      await fetch("/api/rag?action=clear", { method: "POST" });
      setDocCount(0);
      setChatHistory([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 flex items-center justify-center gap-3" style={{ color: 'var(--foreground)' }}>
          <BrainCircuit size={48} style={{ color: 'var(--primary)' }} />
          Private Document Q&A (RAG)
        </h1>
        <p className="text-xl max-w-3xl mx-auto" style={{ color: 'var(--secondary-foreground)' }}>
          Upload your documents and ask questions. Your data remains private and is not used for training.
        </p>
      </div>
      <DocumentManager onFileUpload={handleFileUpload} onClear={handleClear} docCount={docCount} isLoading={isLoading} />
      {error && (
        <div className="mt-6 p-4 rounded-lg" style={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      <ChatInterface onQuery={handleQuery} history={chatHistory} isLoading={isLoading} docCount={docCount} />
    </div>
  )
}
