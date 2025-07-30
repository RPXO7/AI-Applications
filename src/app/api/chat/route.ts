import { NextRequest } from "next/server"
import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { ChatMessage } from "@/types"

// --- AI Provider Configurations ---
const openRouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
})

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || "")

// --- Helper Functions ---
async function tryOpenRouter(messages: ChatMessage[]): Promise<ReadableStream<string> | null> {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "your_openrouter_api_key_here") {
      throw new Error("OpenRouter API key not configured")
    }

    const stream = await openRouterClient.chat.completions.create({
      model: "meta-llama/llama-3.2-3b-instruct:free", // Free model on OpenRouter
      messages: messages.map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      })),
      stream: true,
    })

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ""
            if (content) {
              controller.enqueue(new TextEncoder().encode(content))
            }
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })
  } catch (error) {
    console.log("OpenRouter failed:", error)
    return null
  }
}

async function tryGemini(messages: ChatMessage[]): Promise<ReadableStream<string> | null> {
  try {
    if (!process.env.GOOGLE_GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY === "your_gemini_api_key_here") {
      throw new Error("Gemini API key not configured")
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) // Free tier
    
    // Convert chat history to Gemini format
    const chat = model.startChat({
      history: messages.slice(0, -1).map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })),
    })

    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessageStream(lastMessage.content)

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              controller.enqueue(new TextEncoder().encode(text))
            }
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })
  } catch (error) {
    console.log("Gemini failed:", error)
    return null
  }
}

// Fallback response when all providers fail
function createFallbackResponse(): ReadableStream<string> {
  return new ReadableStream({
    start(controller) {
      const fallbackMessage = "I'm sorry, but I'm currently experiencing technical difficulties with all AI providers. Please check that your API keys are properly configured in the .env.local file and try again later."
      controller.enqueue(new TextEncoder().encode(fallbackMessage))
      controller.close()
    },
  })
}

// --- Main API Route ---
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 })
    }

    // Try providers in order: OpenRouter -> Gemini -> Fallback
    let stream = await tryOpenRouter(messages)
    if (!stream) {
      stream = await tryGemini(messages)
    }
    if (!stream) {
      stream = createFallbackResponse()
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error: any) {
    console.error("Chat API error:", error)
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}
