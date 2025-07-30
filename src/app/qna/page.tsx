"use client"

import { useState } from "react"
import { HelpCircle, Bot } from "lucide-react"
import { QnAResult } from "@/types"

const QnAPage = () => {
  const [question, setQuestion] = useState("")
  const [context, setContext] = useState("")
  const [result, setResult] = useState<QnAResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!question) {
      setError("Please enter a question.")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/qna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setResult(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 flex items-center justify-center gap-3" style={{ color: 'var(--foreground)' }}>
          <HelpCircle size={48} style={{ color: 'var(--primary)' }} />
          Question & Answer
        </h1>
        <p className="text-xl max-w-3xl mx-auto" style={{ color: 'var(--secondary-foreground)' }}>
          Ask any question and get a well-structured, accurate answer from our AI assistant.
        </p>
      </div>

      <div className="p-8 rounded-xl card-shadow-lg space-y-6" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div>
          <label className="text-lg font-semibold block mb-2">Your Question:</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What is the capital of France?"
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:opacity-50"
            style={{
              background: 'var(--muted)',
              color: 'var(--foreground)',
              borderColor: 'var(--border)',
              '--tw-ring-color': 'var(--primary)'
            }}
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="text-lg font-semibold block mb-2">Context (Optional):</label>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Provide any additional context here..."
            className="w-full h-24 p-4 border rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:opacity-50"
            style={{
              background: 'var(--muted)',
              color: 'var(--foreground)',
              borderColor: 'var(--border)',
              '--tw-ring-color': 'var(--primary)'
            }}
            disabled={isLoading}
          />
        </div>
        <button
          onClick={handleSubmit}
          className="w-full px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          disabled={!question || isLoading}
        >
          {isLoading ? "Getting Answer..." : "Ask Question"}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-lg" style={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {isLoading && (
        <div className="mt-6 text-center">
           <p className="text-lg font-semibold animate-pulse" style={{ color: 'var(--primary)' }}>Searching for the answer...</p>
        </div>
      )}

      {result && (
        <div className="mt-8 p-6 rounded-xl card-shadow-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h2 className="text-2xl font-bold mb-4">Answer:</h2>
          <div className="prose max-w-none" style={{ color: 'var(--foreground)' }} dangerouslySetInnerHTML={{ __html: result.answer.replace(/\n/g, '<br />') }}></div>
        </div>
      )}
    </div>
  )
}

export default QnAPage
