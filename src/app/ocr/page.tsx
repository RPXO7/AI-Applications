"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { UploadCloud, FileText, X } from "lucide-react"
import { OCRResult } from "@/types"

const OCR_MODELS = {
  "trocr-base": "TrOCR (Printed)",
  "trocr-large": "TrOCR (Large)",
  "nougat": "Nougat (Scientific)",
}

// --- UI Components ---

const ImageDropzone = ({ onDrop, file, setFile, isLoading }: any) => {
  const onDropCallback = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [setFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropCallback,
    accept: { 'image/*': [".png", ".jpg", ".jpeg"] },
    multiple: false,
    disabled: isLoading,
  })

  return (
    <div
      {...getRootProps()}
      className={`w-full p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors duration-300 ${isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
      style={{ background: 'var(--muted)' }}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-4">
        <UploadCloud size={48} style={{ color: 'var(--primary)' }} className={`transition-transform duration-300 ${isDragActive ? 'scale-110' : ''}`} />
        {file ? (
          <div className="flex items-center gap-2">
            <FileText size={20} style={{ color: 'var(--foreground)' }} />
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{file.name}</span>
            <button 
              onClick={(e) => { e.stopPropagation(); setFile(null); }} 
              className="p-1 rounded-full hover:bg-secondary"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div>
            <p className="font-semibold" style={{ color: 'var(--foreground)' }}>
              {isDragActive ? "Drop the image here!" : "Drag & drop an image, or click to select"}
            </p>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>PNG, JPG, JPEG up to 5MB</p>
          </div>
        )}
      </div>
    </div>
  )
}

const OcrResultDisplay = ({ result }: { result: OCRResult | null }) => {
  if (!result) return null

  return (
    <div className="p-6 rounded-xl card-shadow-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--card-foreground)' }}>Extracted Text</h2>
      <pre className="whitespace-pre-wrap font-sans p-4 rounded-lg" style={{ background: 'var(--muted)', color: 'var(--foreground)' }}>
        {result.text}
      </pre>
      <div className="mt-4 text-sm" style={{ color: 'var(--muted-foreground)' }}>
        Confidence: {result.confidence}% | Language: {result.language}
      </div>
    </div>
  )
}

// --- Main OCR Page ---

export default function OCRPage() {
  const [file, setFile] = useState<File | null>(null)
  const [model, setModel] = useState("trocr-base")
  const [result, setResult] = useState<OCRResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select an image file first.")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("model", model)

    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
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
        <h1 className="text-5xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Image to Text (OCR)</h1>
        <p className="text-xl max-w-2xl mx-auto" style={{ color: 'var(--secondary-foreground)' }}>
          Extract text from images using advanced Optical Character Recognition models.
        </p>
      </div>

      <div className="p-8 rounded-xl card-shadow-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <ImageDropzone onDrop={setFile} file={file} setFile={setFile} isLoading={isLoading} />
        
        <div className="flex flex-wrap items-center justify-between mt-6 gap-4">
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
              {Object.entries(OCR_MODELS).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSubmit}
            className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
            disabled={!file || isLoading}
          >
            {isLoading ? "Extracting Text..." : "Extract Text"}
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
          <p className="text-lg font-semibold animate-pulse" style={{ color: 'var(--primary)' }}>Analyzing image and extracting text...</p>
        </div>
      )}

      {result && (
        <div className="mt-8">
          <OcrResultDisplay result={result} />
        </div>
      )}
    </div>
  )
}
