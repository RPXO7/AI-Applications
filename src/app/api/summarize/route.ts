import { NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { SummarizationResult } from "@/types"

// Initialize Gemini for fallback
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "")

// --- Hugging Face Models for Summarization ---
const HUGGINGFACE_MODELS = {
  "bart-cnn": "facebook/bart-large-cnn",          // Most reliable for news articles
  "t5-small": "google/flan-t5-small",            // General purpose summarization
  "pegasus": "google/pegasus-xsum",              // Best for extreme summarization
} as const

type ModelKey = keyof typeof HUGGINGFACE_MODELS

// --- Hugging Face API Functions ---
async function callHuggingFaceAPI(text: string, model: string): Promise<string> {
  if (!process.env.HUGGINGFACE_API_TOKEN || process.env.HUGGINGFACE_API_TOKEN === "your_huggingface_token_here") {
    throw new Error("Hugging Face API token not configured")
  }

  try {
    console.log(`Calling Hugging Face API with model: ${model}`)
    
    // First, check if the model is ready
    const checkResponse = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`
      }
    })

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text()
      console.error(`Model ${model} not available:`, errorText)
      throw new Error(`Model ${model} not available`)
    }

    // Wait for model to load if needed (max 3 attempts)
    for (let attempt = 0; attempt < 3; attempt++) {
      const loadResponse = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: "Test" })
      })

      const loadResult = await loadResponse.json()
      if (!loadResult.error?.includes("loading")) {
        break
      }

      console.log(`Model ${model} is loading, waiting...`)
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds between attempts
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
          max_length: Math.min(150, Math.floor(text.length * 0.4)), // Dynamic length based on input
          min_length: Math.min(30, Math.floor(text.length * 0.1)),
          do_sample: false,
          early_stopping: true,
          num_beams: 4,
          length_penalty: 2.0,
          no_repeat_ngram_size: 3,
        },
      }),
    })

    let errorMessage = ""
    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error || errorText
      } catch {
        errorMessage = errorText
      }
      console.error(`Hugging Face API error for model ${model}:`, errorMessage)
      throw new Error(`Hugging Face API error: ${errorMessage}`)
    }

    const result = await response.json()
    console.log(`Raw response from ${model}:`, result)
    
    // Handle different response formats
    if (Array.isArray(result)) {
      // Try different possible response formats
      const firstResult = result[0]
      if (firstResult?.summary_text) return firstResult.summary_text
      if (firstResult?.generated_text) return firstResult.generated_text
      if (typeof firstResult === 'string') return firstResult
      
      // If we have an array but no recognized format, try to extract text
      const textContent = result.map(item => {
        if (typeof item === 'string') return item
        if (item?.text) return item.text
        if (item?.generated_text) return item.generated_text
        if (item?.summary_text) return item.summary_text
        return null
      }).filter(Boolean)[0]
      
      if (textContent) return textContent
    } else if (typeof result === 'string') {
      return result
    } else if (result?.generated_text) {
      return result.generated_text
    } else if (result?.summary_text) {
      return result.summary_text
    }
    
    console.error(`Unexpected response format from ${model}:`, result)
    throw new Error(`Unexpected response format from ${model}`)
  } catch (error) {
    console.error(`Error calling Hugging Face API for model ${model}:`, error)
    throw error
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

    // Try the selected model first
    if (HUGGINGFACE_MODELS[model as ModelKey]) {
      summary = await tryHuggingFaceSummarization(text, model as ModelKey)
    }

    // If the selected model fails, try bart-cnn as it's the most reliable
    if (!summary && model !== "bart-cnn") {
      console.log("Selected model failed, trying bart-cnn...")
      summary = await tryHuggingFaceSummarization(text, "bart-cnn")
    }

    // If bart-cnn fails, try flan-t5 as a last resort
    if (!summary && model !== "t5-small") {
      console.log("bart-cnn failed, trying flan-t5...")
      summary = await tryHuggingFaceSummarization(text, "t5-small")
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

  } catch (error: unknown) {
    console.error("Summarization API error:", error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("Hugging Face API error")) {
        return Response.json({
          success: false,
          error: error.message,
          details: "The summarization service is experiencing issues. Trying alternative models..."
        }, { status: 503 })
      }
      
      return Response.json({
        success: false,
        error: error.message,
        details: error.cause
      }, { status: 500 })
    }
    
    return Response.json({
      success: false,
      error: "An unknown error occurred",
      details: "Please try again or contact support if the issue persists."
    }, { status: 500 })
  }
}