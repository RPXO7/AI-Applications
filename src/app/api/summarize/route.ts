import { NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { SummarizationResult } from "@/types"

// Initialize Gemini for fallback
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "")

// --- Hugging Face Models for Summarization ---
const HUGGINGFACE_MODELS = {
  "bart-cnn": "facebook/bart-large-cnn",           // Best for news articles
  "t5-small": "t5-small",                          // Fast, general purpose
  "pegasus": "google/pegasus-large",               // Good for abstractive summaries
} as const

type ModelKey = keyof typeof HUGGINGFACE_MODELS

// --- Hugging Face API Functions ---
async function callHuggingFaceAPI(text: string, model: string): Promise<string> {
  if (!process.env.HUGGINGFACE_API_TOKEN || process.env.HUGGINGFACE_API_TOKEN === "your_huggingface_token_here") {
    throw new Error("Hugging Face API token not configured")
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: text,
      parameters: {
        max_length: 150,
        min_length: 30,
        do_sample: false,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Hugging Face API error: ${error}`)
  }

  const result = await response.json()
  
  // Handle different response formats
  if (Array.isArray(result) && result[0]?.summary_text) {
    return result[0].summary_text
  } else if (Array.isArray(result) && result[0]?.generated_text) {
    return result[0].generated_text
  } else if (typeof result === 'string') {
    return result
  } else {
    throw new Error("Unexpected response format from Hugging Face")
  }
}

async function tryHuggingFaceSummarization(text: string, model: ModelKey): Promise<string | null> {
  try {
    const modelName = HUGGINGFACE_MODELS[model]
    return await callHuggingFaceAPI(text, modelName)
  } catch (error) {
    console.log(`Hugging Face ${model} failed:`, error)
    return null
  }
}

// --- Google Gemini Fallback ---
async function tryGeminiSummarization(text: string, summaryType: string): Promise<string | null> {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY === "your_gemini_api_key_here") {
      throw new Error("Gemini API key not configured")
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    const prompt = `Please provide a ${summaryType} summary of the following text. The summary should be concise, informative, and capture the main points:

Text to summarize:
${text}

Summary:`

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    console.log("Gemini summarization failed:", error)
    return null
  }
}

// --- Utility Functions ---
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

function calculateCompressionRatio(originalText: string, summary: string): number {
  const originalWords = countWords(originalText)
  const summaryWords = countWords(summary)
  return Math.round((1 - summaryWords / originalWords) * 100)
}

// --- Main API Route ---
export async function POST(req: NextRequest) {
  try {
    const { text, model = "bart-cnn", summaryType = "concise" } = await req.json()

    if (!text || typeof text !== "string") {
      return Response.json(
        { success: false, error: "Text is required and must be a string" },
        { status: 400 }
      )
    }

    if (text.length < 50) {
      return Response.json(
        { success: false, error: "Text must be at least 50 characters long" },
        { status: 400 }
      )
    }

    if (text.length > 10000) {
      return Response.json(
        { success: false, error: "Text is too long. Maximum 10,000 characters allowed." },
        { status: 400 }
      )
    }

    let summary: string | null = null

    // Try Hugging Face models in order of preference
    const modelOrder: ModelKey[] = [model as ModelKey, "bart-cnn", "t5-small"]
    
    for (const modelKey of modelOrder) {
      if (HUGGINGFACE_MODELS[modelKey]) {
        summary = await tryHuggingFaceSummarization(text, modelKey)
        if (summary) {
          break
        }
      }
    }

    // Fallback to Gemini if all Hugging Face models fail
    if (!summary) {
      summary = await tryGeminiSummarization(text, summaryType)
    }

    // Final fallback - return error if all providers fail
    if (!summary) {
      return Response.json({
        success: false,
        error: "All summarization services are currently unavailable. Please check your API keys and try again later."
      }, { status: 503 })
    }

    // Prepare response data
    const result: SummarizationResult = {
      originalText: text,
      summary: summary.trim(),
      wordCount: countWords(summary.trim()),
      compressionRatio: calculateCompressionRatio(text, summary.trim())
    }

    return Response.json({
      success: true,
      data: result
    })

  } catch (error: any) {
    console.error("Summarization API error:", error)
    return Response.json({
      success: false,
      error: `Server error: ${error.message}`
    }, { status: 500 })
  }
}
