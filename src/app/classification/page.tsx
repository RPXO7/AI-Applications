"use client"

import { useState, useMemo } from "react"
import { Tag, BarChart, Smile, ThumbsUp, ThumbsDown, Meh } from "lucide-react"
import { ClassificationResult } from "@/types"

const CLASSIFICATION_MODELS = {
  "sentiment-analysis": "Sentiment Analysis",
  "topic-classification": "Topic Classification",
  "emotion-detection": "Emotion Detection",
}

// --- UI Components ---

const getSentimentIcon = (label: string) => {
  switch (label.toLowerCase()) {
    case 'positive': return <ThumbsUp className="text-green-500" />;
    case 'negative': return <ThumbsDown className="text-red-500" />;
    default: return <Meh className="text-yellow-500" />;
  }
}

const ResultDisplay = ({ result }: { result: ClassificationResult | null }) => {
  if (!result) return null;

  const topCategory = result.categories[0];

  return (
    <div className="p-6 rounded-xl card-shadow-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--card-foreground)' }}>
        Classification Result
      </h2>
      <div className="flex items-center justify-between p-4 rounded-lg mb-4" style={{ background: 'var(--muted)' }}>
        <div className="flex items-center gap-2 font-semibold text-lg">
          {getSentimentIcon(topCategory.name)}
          <span>{topCategory.name}</span>
        </div>
        <span className="font-bold text-xl" style={{ color: 'var(--primary)' }}>{topCategory.score}%</span>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--muted-foreground)' }}>Score Distribution:</h3>
        <div className="space-y-2">
          {result.categories.map((cat, i) => (
            <div key={i} className="flex items-center">
              <span className="w-32 text-sm font-medium">{cat.name}</span>
              <div className="flex-grow h-6 rounded-full" style={{ background: 'var(--secondary)' }}>
                <div 
                  className="h-6 rounded-full flex items-center justify-end px-2 text-xs font-bold"
                  style={{ width: `${cat.score}%`, background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                >
                  {cat.score}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// --- Main Classification Page ---

export default function ClassificationPage() {
  const [text, setText] = useState("")
  const [model, setModel] = useState("sentiment-analysis")
  const [customLabels, setCustomLabels] = useState("business, politics, sports")
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text, 
          model, 
          customLabels: model === 'topic-classification' ? customLabels.split(",").map(s => s.trim()) : undefined 
        }),
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
        <h1 className="text-5xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Text Classification</h1>
        <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--secondary-foreground)' }}>
          Analyze and categorize text for sentiment, topics, emotions, and more.
        </p>
      </div>

      <div className="p-8 rounded-xl card-shadow-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to classify..."
          className="w-full h-32 p-4 rounded-lg mb-4 transition-colors focus:outline-none focus:ring-2 disabled:opacity-50"
          style={{ 
            background: 'var(--muted)', 
            border: '1px solid var(--border)', 
            color: 'var(--foreground)',
            '--tw-ring-color': 'var(--primary)'
          }}
          disabled={isLoading}
        />
        
        <div className="flex flex-wrap items-center justify-between gap-4">
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
              {Object.entries(CLASSIFICATION_MODELS).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>
          {model === 'topic-classification' && (
            <input
              type="text"
              value={customLabels}
              onChange={(e) => setCustomLabels(e.target.value)}
              placeholder="Labels (comma-separated)"
              className="flex-grow px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors disabled:opacity-50"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                '--tw-ring-color': 'var(--primary)'
              }}
              disabled={isLoading}
            />
          )}
          <button
            onClick={handleSubmit}
            className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            disabled={!text || isLoading}
          >
            {isLoading ? "Classifying..." : "Classify Text"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-lg" style={{ color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {isLoading && (
        <div className="mt-6 text-center">
          <p className="text-lg font-semibold animate-pulse" style={{ color: 'var(--primary)' }}>Analyzing and classifying text...</p>
        </div>
      )}

      {result && (
        <div className="mt-8">
          <ResultDisplay result={result} />
        </div>
      )}
    </div>
  )
}
