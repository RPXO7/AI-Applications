import { NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { OCRResult } from "@/types"

// --- AI Provider Configurations ---

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "")

// --- Hugging Face Models for OCR ---
const HUGGINGFACE_OCR_MODELS = {
  "trocr-base": "microsoft/trocr-base-printed", // Best for printed text
  "trocr-large": "microsoft/trocr-large-printed", // More accurate but slower
  "nougat": "facebook/nougat-small", // Good for scientific documents
} as const

type OcrModelKey = keyof typeof HUGGINGFACE_OCR_MODELS

// --- Hugging Face API Functions ---

async function callHuggingFaceOcrAPI(imageBuffer: Buffer, model: string): Promise<string> {
  if (!process.env.HUGGINGFACE_API_TOKEN || process.env.HUGGINGFACE_API_TOKEN === "your_huggingface_token_here") {
    throw new Error("Hugging Face API token not configured")
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
      "Content-Type": "image/jpeg", // Or other image types
    },
    body: imageBuffer,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Hugging Face OCR API error: ${error}`)
  }

  const result = await response.json()
  
  if (Array.isArray(result) && result[0]?.generated_text) {
    return result[0].generated_text
  } else {
    throw new Error("Unexpected response format from Hugging Face OCR")
  }
}

async function tryHuggingFaceOcr(imageBuffer: Buffer, model: OcrModelKey): Promise<string | null> {
  try {
    const modelName = HUGGINGFACE_OCR_MODELS[model]
    return await callHuggingFaceOcrAPI(imageBuffer, modelName)
  } catch (error) {
    console.log(`Hugging Face OCR (${model}) failed:`, error)
    return null
  }
}

// --- Google Gemini Vision Fallback ---

async function tryGeminiOcr(imageBuffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY === "your_gemini_api_key_here") {
      throw new Error("Gemini API key not configured")
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType,
      },
    }

    const prompt = "Extract all text from this image, preserving the original formatting as much as possible."
    const result = await model.generateContent([prompt, imagePart])
    
    const response = await result.response
    return response.text()
  } catch (error) {
    console.log("Gemini Vision OCR failed:", error)
    return null
  }
}

// --- Main API Route ---

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const model = (formData.get("model") as OcrModelKey) || "trocr-base"

    if (!file) {
      return Response.json({ success: false, error: "No file uploaded" }, { status: 400 })
    }

    const imageBuffer = Buffer.from(await file.arrayBuffer())

    let extractedText: string | null = null

    // Try Hugging Face models first
    const modelOrder: OcrModelKey[] = [model, "trocr-base", "trocr-large"]

    for (const modelKey of modelOrder) {
      if (HUGGINGFACE_OCR_MODELS[modelKey]) {
        extractedText = await tryHuggingFaceOcr(imageBuffer, modelKey)
        if (extractedText) {
          break
        }
      }
    }

    // Fallback to Gemini Vision if Hugging Face fails
    if (!extractedText) {
      extractedText = await tryGeminiOcr(imageBuffer, file.type)
    }

    if (!extractedText) {
      return Response.json({
        success: false,
        error: "All OCR services are currently unavailable. Please check your API keys and try again later.",
      }, { status: 503 })
    }

    const result: OCRResult = {
      text: extractedText.trim(),
      confidence: 95, // Placeholder confidence
      language: "en",   // Placeholder language
    }

    return Response.json({ success: true, data: result })

  } catch (error: any) {
    console.error("OCR API error:", error)
    return Response.json(
      { success: false, error: `Server error: ${error.message}` },
      { status: 500 }
    )
  }
}