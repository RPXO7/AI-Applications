"use client"

import { useState } from "react"
import { BookOpen, FileText, BarChart2 } from "lucide-react"
import { SummarizationResult } from "@/types"

const HUGGINGFACE_MODELS = {
  "bart-cnn": "BART (News)",
  "t5-small": "T5 (General)",
  "pegasus": "Pegasus (Abstractive)",
}

// --- UI Components ---

const TextArea = ({ value, onChange, placeholder, disabled }: any) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className="w-full h-48 p-4 rounded-lg transition-colors focus:outline-none focus:ring-2 disabled:opacity-50"
    style={{ 
      background: 'var(--card)', 
      border: '1px solid var(--border)', 
      color: 'var(--foreground)',
      '--tw-ring-color': 'var(--primary)'
    }}
    disabled={disabled}
  />
)

const SummaryDisplay = ({ result }: { result: SummarizationResult | null }) => {
  if (!result) return null

  return (
    <div className="p-6 rounded-xl card-shadow-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--card-foreground)' }}>
        <FileText size={24} style={{ color: 'var(--primary)' }}/>
        Generated Summary
      </h2>
      <p className="leading-relaxed text-lg" style={{ color: 'var(--foreground)' }}>{result.summary}</p>
      <div className="flex items-center justify-between mt-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: 'var(--muted)' }}>
          <BarChart2 size={16} />
          <span>Words: {result.wordCount}</span>
        </div>
        <div className="px-3 py-1 rounded-full" style={{ background: 'var(--muted)' }}>
          <span>Compression: {result.compressionRatio}%</span>
        </div>
      </div>
    </div>
  )
}

const ControlPanel = ({ model, setModel, isLoading, onSubmit }: any) => (
  <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
    <div className="flex items-center gap-2">
      <label htmlFor="model-select" className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>Model:</label>
      <select
        id="model-select"
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:opacity-50"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--foreground)',
          '--tw-ring-color': 'var(--primary)'
        }}
        disabled={isLoading}
      >
        {Object.entries(HUGGINGFACE_MODELS).map(([key, name]) => (
          <option key={key} value={key}>{name}</option>
        ))}
      </select>
    </div>
    <button
      onClick={onSubmit}
      className="px-6 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ 
        background: 'var(--primary)',
        color: 'var(--primary-foreground)'
      }}
      disabled={isLoading}
    >
      {isLoading ? "Summarizing..." : "Summarize Text"}
    </button>
  </div>
)

// --- Main Summarization Page ---

export default function SummarizationPage() {
  const [text, setText] = useState("")
  const [model, setModel] = useState("bart-cnn")
  const [result, setResult] = useState<SummarizationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, model }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "An unknown error occurred")
      }

      if (data.success) {
        setResult(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold flex items-center justify-center gap-3 mb-4" style={{ color: 'var(--foreground)' }}>
          <BookOpen size={40} style={{ color: 'var(--primary)' }}/>
          Text Summarization
        </h1>
        <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--secondary-foreground)' }}>
          Condense long articles and documents into concise summaries using advanced AI models.
        </p>
      </div>

      <div className="p-8 rounded-xl card-shadow-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <ControlPanel model={model} setModel={setModel} isLoading={isLoading} onSubmit={handleSubmit} />
        <TextArea
          value={text}
          onChange={setText}
          placeholder="Paste your text here (minimum 50 characters, maximum 10,000 characters)..."
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-lg" style={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {isLoading && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-lg" style={{ background: 'var(--muted)' }}>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
            <p className="text-lg font-semibold pulse-soft" style={{ color: 'var(--foreground)' }}>Analyzing and summarizing your text...</p>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-8">
          <SummaryDisplay result={result} />
        </div>
      )}
    </div>
  )
}
