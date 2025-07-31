import { NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { ClassificationResult } from "@/types"

// --- AI Provider Configurations ---

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "")

// --- Hugging Face Models for Text Classification ---
const HUGGINGFACE_CLASSIFICATION_MODELS = {
  "sentiment-analysis": "cardiffnlp/twitter-roberta-base-sentiment",
  "topic-classification": "facebook/bart-large-mnli",
  "emotion-detection": "SamLowe/roberta-base-go_emotions",
} as const

// --- Label Mappings for Hugging Face Models ---
const LABEL_MAPPINGS = {
  "sentiment-analysis": {
    "LABEL_0": "negative",
    "LABEL_1": "neutral",
    "LABEL_2": "positive"
  },
  "emotion-detection": {
    "LABEL_0": "admiration",
    "LABEL_1": "amusement",
    "LABEL_2": "anger",
    "LABEL_3": "annoyance",
    "LABEL_4": "approval",
    "LABEL_5": "caring",
    "LABEL_6": "confusion",
    "LABEL_7": "curiosity",
    "LABEL_8": "desire",
    "LABEL_9": "disappointment",
    "LABEL_10": "disapproval",
    "LABEL_11": "disgust",
    "LABEL_12": "embarrassment",
    "LABEL_13": "excitement",
    "LABEL_14": "fear",
    "LABEL_15": "gratitude",
    "LABEL_16": "grief",
    "LABEL_17": "joy",
    "LABEL_18": "love",
    "LABEL_19": "nervousness",
    "LABEL_20": "optimism",
    "LABEL_21": "pride",
    "LABEL_22": "realization",
    "LABEL_23": "relief",
    "LABEL_24": "remorse",
    "LABEL_25": "sadness",
    "LABEL_26": "surprise",
    "LABEL_27": "neutral"
  }
} as const

type ClassificationModelKey = keyof typeof HUGGINGFACE_CLASSIFICATION_MODELS

// --- Hugging Face API Functions ---

async function callHuggingFaceClassificationAPI(
  text: string,
  model: string,
  candidateLabels?: string[]
): Promise<any> {
  const apiToken = process.env.HUGGINGFACE_API_TOKEN
  if (!apiToken || apiToken === "your_huggingface_token_here") {
    console.error("Hugging Face API token not configured")
    throw new Error("Hugging Face API token not configured")
  }

  console.log(`Calling Hugging Face API for model: ${model}`)

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
    const result = await callHuggingFaceClassificationAPI(text, modelName, candidateLabels)
    console.log(`Hugging Face classification result for ${model}:`, JSON.stringify(result, null, 2))
    return result
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

    // Check if API tokens are configured
    const huggingfaceToken = process.env.HUGGINGFACE_API_TOKEN
    const geminiToken = process.env.GOOGLE_GEMINI_API_KEY
    
    if ((!huggingfaceToken || huggingfaceToken === "your_huggingface_token_here") && 
        (!geminiToken || geminiToken === "your_gemini_api_key_here")) {
      return Response.json({ 
        success: false, 
        error: "No API tokens configured. Please set HUGGINGFACE_API_TOKEN or GOOGLE_GEMINI_API_KEY environment variables." 
      }, { status: 500 })
    }

    console.log(`Classification request - Model: ${model}, Text length: ${text.length}`)

    let classificationResult: any | null = null

    // Try Hugging Face first
    classificationResult = await tryHuggingFaceClassification(text, model, customLabels)

    // Fallback to Gemini if Hugging Face fails
    if (!classificationResult) {
      console.log("Hugging Face failed, trying Gemini...")
      classificationResult = await tryGeminiClassification(text, model, customLabels)
    }

    if (!classificationResult) {
      return Response.json({
        success: false,
        error: "All classification services are currently unavailable.",
      }, { status: 503 })
    }

    console.log("Raw classification result:", JSON.stringify(classificationResult, null, 2))

    // Normalize the response to our ClassificationResult type
    let normalizedResult: ClassificationResult;
    
    try {
        if (model === 'sentiment-analysis') {
            // Handle different response structures from Hugging Face and Gemini
            let categories: Array<{ name: string; score: number }> = [];
            const labelMap = LABEL_MAPPINGS[model];
            if (Array.isArray(classificationResult)) {
                // If it's an array, flatten and process
                categories = classificationResult.flat().map((c: any) => ({ 
                    name: labelMap?.[c.label] || c.label || c.class || 'unknown', 
                    score: Math.round((c.score || c.confidence || 0) * 100) 
                }));
            } else if (classificationResult.labels && classificationResult.scores) {
                // If it has labels and scores structure
                categories = classificationResult.labels.map((label: string, index: number) => ({
                    name: labelMap?.[label] || label,
                    score: Math.round((classificationResult.scores[index] || 0) * 100)
                }));
            } else if (classificationResult[0] && Array.isArray(classificationResult[0])) {
                // If it's nested array structure
                categories = classificationResult[0].map((c: any) => ({ 
                    name: labelMap?.[c.label] || c.label || c.class || 'unknown', 
                    score: Math.round((c.score || c.confidence || 0) * 100) 
                }));
            } else if (classificationResult.label && typeof classificationResult.score === 'number') {
                // Simple Gemini response structure: {label: "sentiment", score: 0.95}
                categories = [{
                    name: classificationResult.label,
                    score: Math.round(classificationResult.score * 100)
                }];
            } else {
                // Fallback for unknown structure
                console.log('Unknown classification result structure:', classificationResult);
                throw new Error('Unable to parse classification result');
            }
            
            // Sort by score and get the top result
            categories.sort((a, b) => b.score - a.score);
            const topCategory = categories[0];
            
            normalizedResult = {
                label: topCategory.name,
                confidence: topCategory.score,
                categories: categories
            };
            
        } else if (model === 'topic-classification') {
            if (classificationResult.labels && classificationResult.scores) {
                const categories = classificationResult.labels.map((label: string, index: number) => ({
                    name: label,
                    score: Math.round((classificationResult.scores[index] || 0) * 100)
                }));
                
                normalizedResult = {
                    label: categories[0]?.name || 'unknown',
                    confidence: categories[0]?.score || 0,
                    categories: categories
                };
            } else {
                throw new Error('Invalid topic classification result structure');
            }
            
        } else { // emotion-detection
            // Similar handling as sentiment-analysis
            let categories: Array<{ name: string; score: number }> = [];
            const labelMap = LABEL_MAPPINGS[model];
            if (Array.isArray(classificationResult)) {
                categories = classificationResult.flat().map((c: any) => ({ 
                    name: labelMap?.[c.label] || c.label || c.class || 'unknown', 
                    score: Math.round((c.score || c.confidence || 0) * 100) 
                }));
            } else if (classificationResult[0] && Array.isArray(classificationResult[0])) {
                categories = classificationResult[0].map((c: any) => ({ 
                    name: labelMap?.[c.label] || c.label || c.class || 'unknown', 
                    score: Math.round((c.score || c.confidence || 0) * 100) 
                }));
            } else if (classificationResult.label && typeof classificationResult.score === 'number') {
                // Simple Gemini response structure: {label: "emotion", score: 0.95}
                categories = [{
                    name: classificationResult.label,
                    score: Math.round(classificationResult.score * 100)
                }];
            } else {
                console.log('Unknown emotion detection result structure:', classificationResult);
                throw new Error('Unable to parse emotion detection result');
            }
            
            categories.sort((a, b) => b.score - a.score);
            const topCategory = categories[0];
            
            normalizedResult = {
                label: topCategory.name,
                confidence: topCategory.score,
                categories: categories
            };
        }
    } catch (parseError: any) {
        console.error('Error parsing classification result:', parseError);
        console.log('Raw classification result:', classificationResult);
        
        // If parsing fails, try to create a basic fallback result
        try {
            console.log('Attempting fallback result creation...');
            let fallbackResult: ClassificationResult;
            
            if (typeof classificationResult === 'object' && classificationResult !== null) {
                // Try to extract any useful information from the raw result
                const keys = Object.keys(classificationResult);
                console.log('Available keys in result:', keys);
                
                if (classificationResult.label) {
                    fallbackResult = {
                        label: classificationResult.label,
                        confidence: Math.round((classificationResult.score || classificationResult.confidence || 0.5) * 100),
                        categories: [{
                            name: classificationResult.label,
                            score: Math.round((classificationResult.score || classificationResult.confidence || 0.5) * 100)
                        }]
                    };
                } else if (classificationResult.labels && Array.isArray(classificationResult.labels)) {
                    fallbackResult = {
                        label: classificationResult.labels[0] || 'unknown',
                        confidence: Math.round((classificationResult.scores?.[0] || 0.5) * 100),
                        categories: classificationResult.labels.map((label: string, index: number) => ({
                            name: label,
                            score: Math.round((classificationResult.scores?.[index] || 0.5) * 100)
                        }))
                    };
                } else {
                    // Last resort fallback
                    fallbackResult = {
                        label: 'unknown',
                        confidence: 50,
                        categories: [{ name: 'unknown', score: 50 }]
                    };
                }
                
                normalizedResult = fallbackResult;
                console.log('Created fallback result:', fallbackResult);
            } else {
                throw new Error('Invalid result structure for fallback');
            }
        } catch (fallbackError: any) {
            console.error('Fallback also failed:', fallbackError);
            throw new Error(`Failed to parse classification result: ${parseError.message}`);
        }
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
