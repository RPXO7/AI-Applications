import { NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { ClassificationResult } from "@/types"

// --- AI Provider Configurations ---

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "")

// --- Hugging Face Models for Text Classification ---
const HUGGINGFACE_CLASSIFICATION_MODELS = {
  "sentiment-analysis": "cardiffnlp/twitter-roberta-base-sentiment-latest",
  "topic-classification": "facebook/bart-large-mnli",
  "emotion-detection": "joeddav/distilbert-base-uncased-go-emotions-student",
} as const

type ClassificationModelKey = keyof typeof HUGGINGFACE_CLASSIFICATION_MODELS

// --- Hugging Face API Functions ---

async function callHuggingFaceClassificationAPI(
  text: string,
  model: string,
  candidateLabels?: string[]
): Promise<any> {
  if (!process.env.HUGGINGFACE_API_TOKEN || process.env.HUGGINGFACE_API_TOKEN === "your_huggingface_token_here") {
    throw new Error("Hugging Face API token not configured")
  }

  const payload: any = { inputs: text }
  if (candidateLabels) {
    payload.parameters = { candidate_labels: candidateLabels }
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Hugging Face API error: ${error}`)
  }

  return response.json()
}

async function tryHuggingFaceClassification(
  text: string,
  model: ClassificationModelKey,
  customLabels?: string[]
): Promise<any | null> {
  try {
    const modelName = HUGGINGFACE_CLASSIFICATION_MODELS[model]
    const candidateLabels = model === 'topic-classification' ? customLabels : undefined
    return await callHuggingFaceClassificationAPI(text, modelName, candidateLabels)
  } catch (error) {
    console.log(`Hugging Face classification (${model}) failed:`, error)
    return null
  }
}

// --- Google Gemini Fallback ---

async function tryGeminiClassification(
  text: string,
  model: ClassificationModelKey,
  customLabels?: string[]
): Promise<any | null> {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY === "your_gemini_api_key_here") {
      throw new Error("Gemini API key not configured")
    }

    const gemini = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    let prompt = `Analyze the following text: "${text}".\n\n`
    if (model === 'sentiment-analysis') {
      prompt += `Classify the sentiment as positive, negative, or neutral. Provide the result in JSON format: {"label": "sentiment", "score": 0.99}`
    } else if (model === 'topic-classification' && customLabels) {
      prompt += `Classify the text into one of these categories: ${customLabels.join(", ")}. Provide the result in JSON format: {"labels": ["..."], "scores": [...]}`
    } else if (model === 'emotion-detection') {
      prompt += `Detect the primary emotion. Provide the result in JSON format: {"label": "emotion", "score": 0.99}`
    } else {
      return null
    }

    const result = await gemini.generateContent(prompt)
    const response = await result.response
    const jsonResponse = JSON.parse(response.text().replace(/```json\n|```/g, ''))
    return jsonResponse

  } catch (error) {
    console.log("Gemini classification failed:", error)
    return null
  }
}

// --- Main API Route ---

export async function POST(req: NextRequest) {
  try {
    const { text, model, customLabels } = await req.json()

    if (!text || typeof text !== "string" || !model) {
      return Response.json({ success: false, error: "Invalid request body" }, { status: 400 })
    }

    let classificationResult: any | null = null

    // Try Hugging Face first
    classificationResult = await tryHuggingFaceClassification(text, model, customLabels)

    // Fallback to Gemini if Hugging Face fails
    if (!classificationResult) {
      classificationResult = await tryGeminiClassification(text, model, customLabels)
    }

    if (!classificationResult) {
      return Response.json({
        success: false,
        error: "All classification services are currently unavailable.",
      }, { status: 503 })
    }

    // Normalize the response to our ClassificationResult type
    let normalizedResult: ClassificationResult;
    if (model === 'sentiment-analysis') {
        const topResult = Array.isArray(classificationResult) ? classificationResult[0][0] : classificationResult[0];
        normalizedResult = {
            label: topResult.label,
            confidence: Math.round(topResult.score * 100),
            categories: classificationResult.flat().map((c: any) => ({ name: c.label, score: Math.round(c.score * 100) }))
        };
    } else if (model === 'topic-classification') {
        normalizedResult = {
            label: classificationResult.labels[0],
            confidence: Math.round(classificationResult.scores[0] * 100),
            categories: classificationResult.labels.map((label: string, index: number) => ({
                name: label,
                score: Math.round(classificationResult.scores[index] * 100)
            }))
        };
    } else { // emotion-detection
        const topResult = Array.isArray(classificationResult) ? classificationResult[0][0] : classificationResult[0];
        normalizedResult = {
            label: topResult.label,
            confidence: Math.round(topResult.score * 100),
            categories: classificationResult.flat().map((c: any) => ({ name: c.label, score: Math.round(c.score * 100) }))
        };
    }

    return Response.json({ success: true, data: normalizedResult })

  } catch (error: any) {
    console.error("Classification API error:", error)
    return Response.json(
      { success: false, error: `Server error: ${error.message}` },
      { status: 500 }
    )
  }
}
